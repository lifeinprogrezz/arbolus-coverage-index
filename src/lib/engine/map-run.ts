import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { cachedFetchText, cachedFetchJson } from "./fetch-cache";
import { checkEligibility } from "./exclusions";
import { composeDrafts } from "./composer";
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

// Masking at the API layer (audit 42 §5 — case-fatal if leaked): the SSE
// stream never carries full names or quotes; those live in the DB and are
// revealed only through the book view's explicit unmask toggle.
function maskEvent(e: LaneEvent): LaneEvent {
  if (e.type !== "evidence") return e;
  const { person, evidence_quote, ...rest } = e.row;
  return {
    ...e,
    row: {
      ...rest,
      evidence_quote: undefined,
      person: person
        ? {
            full_name: "[MASKED]",
            title: person.title,
            role_signal: person.role_signal,
          }
        : undefined,
    },
  };
}

function makeCtx(emit: (e: LaneEvent) => void, maxRequests = 40): LaneCtx {
  return {
    fetchText: cachedFetchText,
    fetchJson: cachedFetchJson,
    emit: (e) => emit(maskEvent(e)),
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

// Replay mode: re-stream the vendor's LAST run from the journal + index —
// no upstream requests, no LLM calls, honest label. This is the demo's
// safety net (audit 42 §5: failure modes are built, not improvised).
export async function replayRun(
  vendor: Vendor,
  emit: (e: RunEvent) => void
): Promise<void> {
  const supa = db();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const { data: lastJournal } = await supa
    .from("run_journal")
    .select("run_id, lane, status, items_found, cost_usd, latency_ms, detail, created_at")
    .eq("vendor_id", vendor.id)
    .neq("status", "local_preseed") // preseed rows have per-row run_ids — not replayable runs
    .order("id", { ascending: false })
    .limit(24);
  const runId = (lastJournal ?? [])[0]?.run_id; // newest row's run — BEFORE reversing
  if (!runId) {
    emit({ type: "stage", name: "no prior run to replay — run a live map first" });
    return;
  }
  const journal = (lastJournal ?? []).filter((r) => r.run_id === runId).reverse();

  emit({ type: "run_start", run_id: runId, vendor });
  emit({ type: "stage", name: "replay — cached run, no upstream requests" });

  const { data: cands } = await supa
    .from("candidates")
    .select("full_name, title, employer, persona_class, eligible, exclusion_reason, evidence")
    .eq("vendor_id", vendor.id)
    .limit(30);

  for (const j of journal) {
    emit({ type: "lane_start", lane: j.lane });
    await sleep(250);
    // stream this lane's share of evidence rows between start and done
    const laneCands = (cands ?? []).filter(
      (c) => (c.evidence?.[0]?.type ?? "") !== "" && j.lane === "customer_pages"
    );
    for (const c of laneCands.slice(0, 8)) {
      emit({
        type: "evidence",
        lane: j.lane,
        row: {
          org_name: c.employer ?? "—",
          evidence_type: c.evidence?.[0]?.type ?? "case_study",
          status: "current",
          person: { full_name: "[MASKED]", title: c.title ?? undefined },
        },
      });
      await sleep(120);
    }
    emit({
      type: "lane_done",
      lane: j.lane,
      found: j.items_found,
      cost_usd: Number(j.cost_usd),
      latency_ms: j.latency_ms ?? 0,
      note: (j.detail as { note?: string })?.note,
      error: (j.detail as { error?: string })?.error,
    });
    await sleep(150);
  }

  const b = (await supa.from("vendors").select("book_state").eq("id", vendor.id).single())
    .data?.book_state as { seeds?: number; keys?: number; excluded?: number } | undefined;
  emit({
    type: "run_done",
    run_id: runId,
    orgs: b?.keys ?? 0,
    candidates: b?.seeds ?? 0,
    excluded: b?.excluded ?? 0,
    cost_usd: journal.reduce((a, j) => a + Number(j.cost_usd), 0),
    latency_ms: journal.reduce((a, j) => a + (j.latency_ms ?? 0), 0),
  });
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
      detail: { requests: r.requests, note: r.note?.slice(0, 200), error: r.error },
    });
  };

  // ---- stage 1: sitemap (feeds everything) ----
  emit({ type: "stage", name: "sitemap" });
  const smRes = await sitemapLane(vendor, makeCtx(emit));
  await journal(smRes);
  const harvest: SitemapHarvest = (smRes.data as SitemapHarvest) ?? {
    customerPages: [],
    alternativePages: [],
    integrationPages: [],
    competitorsDetected: [],
    allUrls: [],
  };

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

  // ---- reservoir join first (synthetic base, real join logic), so each
  // candidate row can carry its reservoir_match flag ----
  emit({ type: "stage", name: "reservoir" });
  const allDomains = [
    ...new Set(allRows.map((r) => r.org_domain).filter(Boolean)),
  ] as string[];
  let reservoirHits: { employer_domain: string | null }[] = [];
  if (allDomains.length > 0) {
    const { data: hits } = await supa
      .from("reservoir_experts")
      .select("employer_domain")
      .in("employer_domain", allDomains);
    reservoirHits = hits ?? [];
  }
  const reservoirDomains = new Set(
    reservoirHits.map((h) => h.employer_domain).filter(Boolean)
  );

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
        person: "[MASKED]",
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
      reservoir_match: Boolean(
        (person.employer_domain ?? first.org_domain) &&
          reservoirDomains.has(person.employer_domain ?? first.org_domain ?? "")
      ),
    });
    if (!error) candCount++;
  }

  // ---- compose: evidence-anchored invite drafts (drafted, NEVER sent) ----
  emit({ type: "stage", name: "compose" });
  // scarcity pricing (§9.2): the thinner the book, the higher the bounty
  const bounty = candCount >= 8 ? 25 : candCount >= 3 ? 50 : 75;
  try {
    const t1 = Date.now();
    const nDrafts = await composeDrafts(vendor, bounty, (m) =>
      emit({ type: "lane_progress", lane: "compose", message: m })
    );
    await supa.from("run_journal").insert({
      run_id,
      vendor_id: vendor.id,
      lane: "compose",
      status: "done",
      items_found: nDrafts,
      cost_usd: 0.01,
      latency_ms: Date.now() - t1,
      detail: { bounty, note: "drafts only — sent flag never flips" },
    });
  } catch (e) {
    emit({ type: "lane_progress", lane: "compose", message: `composer skipped: ${String(e)}` });
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
        reservoir_hits: reservoirHits.length,
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
