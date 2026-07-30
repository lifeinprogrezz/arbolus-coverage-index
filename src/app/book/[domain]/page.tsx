import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { channelMask, CHANNEL_STATE_PILL } from "@/lib/channel-mask";
import { candidateLabel, patternGuess, redactQuote, sourceDomain } from "@/lib/mask";
import BookTable, { type DisplayCandidate } from "./book-table";

export const dynamic = "force-dynamic";

// Book view (build spec §7.3). Masking is applied HERE, server-side: the
// default render's payload contains no names, no raw quotes, no evidence
// URLs. ?unmask=1 is the one explicit switch that renders identities.

interface DbEvidence {
  url?: string | null;
  date?: string | null;
  type?: string | null;
  quote?: string | null;
  source_domain?: string | null;
}

interface DbCandidate {
  id: string;
  full_name: string | null;
  title: string | null;
  employer: string | null;
  employer_domain: string | null;
  persona_class: number | null;
  role_signal: string | null;
  evidence: DbEvidence[];
  confidence: number | null;
  confidence_parts: Record<string, number> | null;
  contact_state: string;
  eligible: boolean;
  exclusion_reason: string | null;
  reservoir_match: boolean;
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ domain: string }>;
  searchParams: Promise<{ unmask?: string }>;
}) {
  const [{ domain: rawDomain }, { unmask }] = await Promise.all([params, searchParams]);
  const unmasked = unmask === "1";
  // tolerate pasted URLs in the route segment
  const domain = decodeURIComponent(rawDomain)
    .replace(/^https?:?\/*/, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  const supa = db();

  const { data: vendor } = await supa
    .from("vendors")
    .select("*")
    .eq("domain", domain)
    .maybeSingle();
  if (!vendor) notFound();

  const [{ data: candidates }, { data: orgs }] = await Promise.all([
    supa
      .from("candidates")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("confidence", { ascending: false, nullsFirst: false }),
    supa
      .from("customer_orgs")
      .select("org_name, org_domain, status")
      .eq("vendor_id", vendor.id),
  ]);

  // server-side masking: what leaves this function is already safe
  let eligibleIdx = 0;
  let excludedIdx = 0;
  const display: DisplayCandidate[] = ((candidates ?? []) as DbCandidate[]).map((c) => {
    const identity = unmasked
      ? c.full_name ?? "—"
      : c.eligible
      ? candidateLabel(eligibleIdx++)
      : `Excluded #${++excludedIdx}`;
    return {
      id: c.id,
      identity,
      title: c.title,
      employer: c.employer,
      persona_class: c.persona_class,
      role_signal: c.role_signal,
      evidence: (c.evidence ?? []).map((e) => ({
        type: e.type ?? null,
        source_domain: e.source_domain ?? sourceDomain(e.url),
        date: e.date ?? null,
        quote: unmasked ? e.quote ?? "" : redactQuote(e.quote, c.full_name),
        url: unmasked ? e.url ?? null : null,
      })),
      confidence: c.confidence,
      confidence_parts: c.confidence_parts,
      contact_state: c.contact_state,
      contact_guess:
        c.full_name && (c.employer_domain ?? undefined)
          ? patternGuess(c.full_name, c.employer_domain as string, unmasked)
          : null,
      eligible: c.eligible,
      exclusion_reason: c.exclusion_reason,
      reservoir_match: c.reservoir_match,
    };
  });

  // reservoir join — org-level; synthetic base, REAL join logic
  const domains = [...new Set((orgs ?? []).map((o) => o.org_domain).filter(Boolean))];
  const { data: reservoirHits } = domains.length
    ? await supa
        .from("reservoir_experts")
        .select("title, employer, dormant")
        .in("employer_domain", domains as string[])
    : { data: [] };

  const mask = channelMask(vendor.hq_country);
  const churned = (orgs ?? []).filter((o) => o.status === "churned");

  return (
    <div className="page-grain min-h-screen">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold !text-ink no-underline">
              Coverage Index
            </Link>
            <span className="pill bg-city-barcelona">book</span>
            <span className="font-medium">{vendor.name}</span>
            <span className="provenance">{vendor.domain}</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/coverage" className="text-sm">
              ← board
            </Link>
            <Link
              href="/run"
              className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium !text-white no-underline hover:bg-ink-hover"
            >
              re-map
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <BookTable
          candidates={display}
          unmasked={unmasked}
          toggleHref={unmasked ? `/book/${vendor.domain}` : `/book/${vendor.domain}?unmask=1`}
        />

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {/* reservoir panel */}
          <section className="rounded-lg border border-violet-100 bg-violet-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Reservoir join</h2>
              <span className="pill bg-city-sanjose">synthetic base · real join</span>
            </div>
            <p className="mt-1 text-sm text-subtle-deep">
              &ldquo;Which of our experts work at an org the index says uses{" "}
              {vendor.name}?&rdquo; — already verified, already paid, zero acquisition
              cost. The measured hit-ratio on the real 200k base is the experiment&rsquo;s
              first falsifiable claim.
            </p>
            <div className="metric mt-3 text-2xl text-violet-link">
              {(reservoirHits ?? []).length} hits
            </div>
            <div className="mt-2 flex flex-col gap-1">
              {(reservoirHits ?? []).slice(0, 6).map((r, i) => (
                <div key={i} className="provenance">
                  {r.title} @ {r.employer}
                  {r.dormant ? " · dormant (reactivation loop)" : ""}
                </div>
              ))}
            </div>
          </section>

          {/* channel-legality mask */}
          <section className="rounded-lg border border-line bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">Channel mask</h2>
              <span className="provenance">
                hq: {vendor.hq_country ?? "unknown — defaults shown"}
              </span>
            </div>
            <div className="mt-3 flex flex-col gap-1.5">
              {mask.map((r) => (
                <div key={r.channel} className="flex items-start gap-2">
                  <span className={`pill mt-0.5 shrink-0 ${CHANNEL_STATE_PILL[r.state]}`}>
                    {r.state.replace("_", "-")}
                  </span>
                  <div>
                    <span className="text-sm font-medium text-ink">{r.channel}</span>
                    <span className="ml-2 text-xs text-subtle">{r.why}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* churn candidates */}
        {churned.length > 0 && (
          <section className="mt-6 rounded-md border border-line bg-card p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-base font-semibold text-ink">
              Churn candidates{" "}
              <span className="metric text-sm text-subtle">({churned.length})</span>
            </h2>
            <p className="mt-1 text-sm text-subtle">
              Customer evidence that existed historically and vanished from the live site
              (Wayback page diff + archived logo-wall diff) — flagged as candidates, not
              facts; premium interview targets (renewal intent, switching factors).
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {churned.map((o) => (
                <span key={o.org_name} className="pill bg-city-newdelhi">
                  {o.org_name}
                </span>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
