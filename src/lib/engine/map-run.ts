import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { cachedFetchText, cachedFetchJson } from "./fetch-cache";
import { checkEligibility } from "./exclusions";
import { sitemapLane, type SitemapHarvest } from "./lanes/sitemap";
import { customerPagesLane } from "./lanes/customer-pages";
import { waybackLane } from "./lanes/wayback";
import { atsLane } from "./lanes/ats";
import { peerspotLane } from "./lanes/peerspot";
import { serpLane } from "./lanes/serp";
import type { EvidenceRow, LaneCtx, LaneEvent, LaneResult, Vendor } from "./types";

// The 10-step map run (build spec §2), prototype build: 6 live lanes +
// classify + exclude + write. Lanes 6/7 extras (Discourse, TED, GitHub)
// render as pre-seeded local lanes per the locked cut order (audit 42 §6).

export type RunEvent =
  | LaneEvent
  | { type: "run_start"; run_id: string; vendor: Vendor }
  | { type: "stage"; name: string }
  | {
      type: "exclusion";
      org_name: string;
      person?: string;
      reason: string;
    }
  | {
      type: "run_done";
      run_id: string;
      orgs: number;
      candidates: number;
      excluded: number;
      cost_usd: number;
      latency_ms: number;
    };

function makeCtx(emit: (e: LaneEvent) => void, maxRequests = 40): LaneCtx {
  return {
    fetchText: cachedFetchText,
    fetchJson: cachedFetchJson,
    emit,
    budget: { maxRequests },
  };
}

export async function ensureVendor(name: string, domain: string): Promise<Vendor> {
  const supa = db();
  const clean = domain.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "");
  const { data: existing } = await supa
    .from("vendors")
    .select("*")
    .eq("domain", clean)
    .maybeSingle();
  if (existing) return existing as Vendor;
  const { data: created, error } = await supa
    .from("vendors")
    .insert({ name, domain: clean, exclusion_domains: [clean] })
    .select("*")
    .single();
  if (error) throw new Error(`vendor insert failed: ${error.message}`);
  return created as Vendor;
}

export async function mapRun(
  vendor: Vendor,
  emit: (e: RunEvent) => void
): Promise<void> {
  const supa = db();
  const run_id = randomUUID();
  const t0 = Date.now();
  emit({ type: "run_start", run_id, vendor });

  const journal = async (r: LaneResult) => {
    await supa.from("run_journal").insert({
      run_id,
      vendor_id: vendor.id,
      lane: r.lane,
      status: r.error ? "error" : "done",
      items_found: r.rows.length,
      cost_usd: r.cost_usd,
      latency_ms: r.latency_ms,
      detail: { requests: r.requests, note: r.note, error: r.error },
    });
  };

  // ---- stage 1: sitemap (feeds everything) ----
  emit({ type: "stage", name: "sitemap" });
  const smRes = await sitemapLane(vendor, makeCtx(emit));
  await journal(smRes);
  let harvest: SitemapHarvest = {
    customerPages: [],
    alternativePages: [],
    integrationPages: [],
    competitorsDetected: [],
    allUrls: [],
  };
  try {
    harvest = JSON.parse(smRes.note ?? "{}");
  } catch {
    /* keep empty harvest */
  }

  // competitor self-declarations extend the vendor row
  if (harvest.competitorsDetected.length > 0) {
    const merged = [
      ...new Set([...vendor.competitor_set, ...harvest.competitorsDetected]),
    ];
    vendor.competitor_set = merged;
    await supa.from("vendors").update({ competitor_set: merged }).eq("id", vendor.id);
  }

  // ---- stage 2: parallel evidence lanes ----
  emit({ type: "stage", name: "evidence" });
  const stage2 = await Promise.all([
    customerPagesLane(harvest)(vendor, makeCtx(emit)),
    waybackLane(harvest)(vendor, makeCtx(emit)),
    peerspotLane(vendor, makeCtx(emit)),
    serpLane(vendor, makeCtx(emit, 16)),
  ]);
  for (const r of stage2) await journal(r);

  // ---- stage 3: ATS sweep over the orgs the evidence surfaced ----
  emit({ type: "stage", name: "ats" });
  const orgNames = [
    ...new Set(
      stage2
        .flatMap((r) => r.rows)
        .map((r) => r.org_name)
        .filter(Boolean)
    ),
  ];
  const atsRes = await atsLane(orgNames)(vendor, makeCtx(emit));
  await journal(atsRes);

  // ---- stage 4: exclusions + write ----
  emit({ type: "stage", name: "write" });
  const allRows: EvidenceRow[] = [...stage2.flatMap((r) => r.rows), ...atsRes.rows];

  // a map run REFRESHES the vendor's book — no cross-run duplicate rows
  await supa.from("candidates").delete().eq("vendor_id", vendor.id);
  await supa.from("customer_orgs").delete().eq("vendor_id", vendor.id);

  let orgCount = 0;
  let candCount = 0;
  let exclCount = 0;
  const orgIds = new Map<string, string>();

  for (const row of allRows) {
    if (!row.org_name) continue;
    const orgKey = row.org_name.toLowerCase();

    if (!orgIds.has(orgKey)) {
      const { data: org } = await supa
        .from("customer_orgs")
        .upsert(
          {
            vendor_id: vendor.id,
            org_name: row.org_name,
            org_domain: row.org_domain ?? null,
            evidence_type: row.evidence_type,
            evidence_url: row.evidence_url ?? "",
            evidence_date: row.evidence_date ?? null,
            evidence_quote: row.evidence_quote ?? null,
            status: row.status ?? "current",
            confidence: (row as { confidence?: number }).confidence ?? null,
            confidence_parts:
              (row as { confidence_parts?: object }).confidence_parts ?? null,
          },
          { onConflict: "vendor_id,org_name,evidence_url", ignoreDuplicates: false }
        )
        .select("id")
        .maybeSingle();
      if (org?.id) {
        orgIds.set(orgKey, org.id);
        orgCount++;
      }
    }

  }

  // ---- person rows: merge per (name, employer) so one candidate carries
  // its whole evidence chain instead of one row per quote ----
  const persons = new Map<string, EvidenceRow[]>();
  for (const row of allRows) {
    if (!row.person?.full_name) continue;
    const key = `${row.person.full_name.toLowerCase()}|${(row.person.employer ?? row.org_name).toLowerCase()}`;
    persons.set(key, [...(persons.get(key) ?? []), row]);
  }

  for (const group of persons.values()) {
    const first = group[0];
    const person = first.person!;
    const orgKey = first.org_name.toLowerCase();
    const verdict = checkEligibility(first, vendor);
    if (!verdict.eligible) {
      exclCount++;
      emit({
        type: "exclusion",
        org_name: first.org_name,
        person: person.full_name,
        reason: verdict.reason ?? "unknown",
      });
    }
    const cls = group
      .map((r) => (r as { persona_class?: number }).persona_class)
      .find((c) => c && c >= 1 && c <= 4);
    const confidences = group
      .map((r) => (r as { confidence?: number }).confidence)
      .filter((c): c is number => typeof c === "number");
    const evidenceSeen = new Set<string>();
    const evidence = group
      .filter((r) => {
        const k = `${r.evidence_url}|${r.evidence_quote}`;
        if (evidenceSeen.has(k)) return false;
        evidenceSeen.add(k);
        return true;
      })
      .map((r) => ({
        url: r.evidence_url,
        date: r.evidence_date,
        type: r.evidence_type,
        quote: r.evidence_quote,
        source_domain: r.evidence_url ? new URL(r.evidence_url).hostname : null,
      }));

    const { error } = await supa.from("candidates").insert({
      vendor_id: vendor.id,
      org_id: orgIds.get(orgKey) ?? null,
      full_name: person.full_name,
      title: person.title ?? null,
      employer: person.employer ?? first.org_name,
      employer_domain: person.employer_domain ?? first.org_domain ?? null,
      persona_class: cls ?? null,
      role_signal: person.role_signal ?? null,
      evidence,
      confidence: confidences.length ? Math.max(...confidences) : null,
      confidence_parts:
        (first as { confidence_parts?: object }).confidence_parts ?? null,
      eligible: verdict.eligible,
      exclusion_reason: verdict.reason,
    });
    if (!error) candCount++;
  }

  // ---- reservoir join (synthetic base, real join logic) ----
  emit({ type: "stage", name: "reservoir" });
  const domains = [...new Set(allRows.map((r) => r.org_domain).filter(Boolean))];
  let reservoirHits = 0;
  if (domains.length > 0) {
    const { data: hits } = await supa
      .from("reservoir_experts")
      .select("id, employer_domain")
      .in("employer_domain", domains as string[]);
    reservoirHits = hits?.length ?? 0;
  }

  const totalCost =
    smRes.cost_usd + stage2.reduce((a, r) => a + r.cost_usd, 0) + atsRes.cost_usd;

  await supa
    .from("vendors")
    .update({
      last_mapped_at: new Date().toISOString(),
      map_cost_usd: totalCost,
      book_state: {
        seeds: candCount,
        keys: orgCount,
        excluded: exclCount,
        reservoir_hits: reservoirHits,
        last_run: run_id,
      },
    })
    .eq("id", vendor.id);

  emit({
    type: "run_done",
    run_id,
    orgs: orgCount,
    candidates: candCount,
    excluded: exclCount,
    cost_usd: totalCost,
    latency_ms: Date.now() - t0,
  });
}
