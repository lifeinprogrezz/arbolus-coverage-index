import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { channelMask, CHANNEL_STATE_PILL } from "@/lib/channel-mask";
import { candidateLabel, patternGuess, redactQuote, sourceDomain } from "@/lib/mask";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";
import CoLogo from "@/components/ui/co-logo";
import InfoHint from "@/components/ui/info-hint";
import { CountTicker } from "@/components/ui/ticker";
import { vendorName } from "../../vendor-name";
import BookTable, { type DisplayCandidate } from "./book-table";

export const dynamic = "force-dynamic";

// Plain-English names for the channel-mask states (the raw keys live in lib).
const CHANNEL_STATE_LABEL: Record<string, string> = {
  open: "open",
  locked: "closed",
  consent_first: "consent first",
  counsel: "legal check",
};

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
      employer_domain: c.employer_domain,
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
  const hits = reservoirHits ?? [];

  const mask = channelMask(vendor.hq_country);
  const churned = (orgs ?? []).filter((o) => o.status === "churned");
  const toggleHref = unmasked
    ? `/book/${vendor.domain}`
    : `/book/${vendor.domain}?unmask=1`;

  return (
    <div className="page-grain min-h-screen">
      <AppHeader
        variant="paper"
        right={
          <>
            <Link
              href={toggleHref}
              className={`rounded-md border px-3 py-1.5 text-caption font-medium no-underline transition-colors ${
                unmasked
                  ? "border-warn-border bg-warn-bg !text-warn-text hover:border-warn"
                  : "border-line bg-card !text-ink hover:bg-ground-tint"
              }`}
            >
              {unmasked ? "re-mask" : "unmask identities"}
            </Link>
            <Link
              href={`/run?domain=${encodeURIComponent(vendor.domain)}&name=${encodeURIComponent(vendor.name)}`}
              className="rounded-md bg-ink px-4 py-1.5 text-control font-medium !text-white no-underline transition-colors hover:bg-ink-hover active:bg-ink-active"
            >
              re-map
            </Link>
          </>
        }
      />

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <div className="reveal mb-6 flex flex-wrap items-center gap-3">
          <Link
            href="/coverage"
            aria-label="Back to the board"
            title="Back to the board"
            className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-line bg-card !text-subtle no-underline transition-colors hover:border-ink-35 hover:bg-ground-tint hover:!text-ink"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
              className="transition-transform duration-150 group-hover:-translate-x-0.5"
            >
              <path
                d="M12.5 7H2M2 7l4.2-4.2M2 7l4.2 4.2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
          <CoLogo name={vendor.name} domain={vendor.domain} size={36} />
          <div>
            <h1 className="text-page">{vendorName(vendor.name)}</h1>
            <div className="provenance">
              {vendor.domain}
              {vendor.category ? ` · ${vendor.category}` : ""}
            </div>
          </div>
        </div>

        <div className="reveal reveal-d1">
          <BookTable candidates={display} unmasked={unmasked} />
        </div>

        <div className="reveal reveal-d2 mt-10 grid items-start gap-6 lg:grid-cols-2">
          {/* reservoir panel — violet hero */}
          <section className="self-start rounded-xl border border-violet-100 bg-violet-50 p-5 shadow-[var(--shadow-glow-violet)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="eyebrow">Experts we already have</h2>
                <InfoHint>
                  Which of our experts already work at a company the index says uses{" "}
                  {vendorName(vendor.name)}? They are verified and paid already, so
                  they cost nothing to acquire. How often that match lands, measured
                  on the real 200k base, is the first claim this experiment can prove
                  or disprove. Experts who have gone quiet get a re-engagement email.
                </InfoHint>
              </div>
              <span className="pill bg-city-sanjose">simulated base · real matching</span>
            </div>
            <div className="mt-3 flex items-baseline gap-2.5">
              <CountTicker value={hits.length} className="text-display text-violet-link" />
              <span className="text-dense text-subtle-deep">
                experts already in the network
              </span>
            </div>
            {hits.length > 0 && (
              <div className="dg mt-4">
                {hits.slice(0, 6).map((r, i) => (
                  <Fragment key={i}>
                    <span className="dg-k">{r.employer}</span>
                    <span className="dg-v">
                      {r.title}
                      {r.dormant && (
                        <span className="pill ml-2 bg-city-newdelhi">dormant</span>
                      )}
                    </span>
                  </Fragment>
                ))}
              </div>
            )}
          </section>

          {/* channel-legality mask */}
          <section className="pane p-5">
            <div className="flex items-center gap-2">
              <h2 className="eyebrow">How we&rsquo;re allowed to contact them</h2>
              <span className="flex translate-y-px items-center">
                <InfoHint>
                  <p>
                    Each row is one way of reaching the people above, with its
                    legal status: <em>open</em> — go ahead · <em>consent
                    first</em> — only after they opt in · <em>legal check</em> —
                    that country&rsquo;s law is unresearched, counsel before use ·{" "}
                    <em>closed</em> — never.
                  </p>
                  <p className="mt-2">
                    Contact law follows the recipient, so in production these
                    rules are checked per person at the moment an address is
                    resolved — a candidate in Japan gets Japan&rsquo;s rules even
                    when the vendor is German. This panel shows one ruleset per
                    vendor, from its head office, as the stated simplification.
                  </p>
                </InfoHint>
              </span>
            </div>
            <div className="mt-2 flex flex-col">
              {mask.map((r) => (
                <div
                  key={r.channel}
                  className="flex items-center gap-2.5 border-b border-line/70 py-2 last:border-0"
                >
                  <span
                    className={`pill shrink-0 whitespace-nowrap ${CHANNEL_STATE_PILL[r.state]}`}
                  >
                    {CHANNEL_STATE_LABEL[r.state] ?? r.state.replace(/_/g, " ")}
                  </span>
                  <span className="text-control font-medium text-ink">{r.channel}</span>
                  <span className="ml-auto">
                    <InfoHint align="right">{r.why}</InfoHint>
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* churn candidates */}
        {churned.length > 0 && (
          <section className="pane reveal reveal-d3 mt-6 p-5">
            <div className="flex items-center gap-2">
              <h2 className="eyebrow">Customers who look like they left</h2>
              <span className="metric text-dense text-subtle">{churned.length}</span>
              <InfoHint>
                Found by comparing today&rsquo;s site against older snapshots of it:
                customers who used to be named or shown as logos and are not any more.
                They make strong interview targets, because they know why they left
                and what they switched to.
              </InfoHint>
            </div>
            <p className="mt-1.5 text-dense text-subtle">
              Flagged as candidates, not facts.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {churned.map((o) => (
                <span key={o.org_name} className="pill bg-city-newdelhi">
                  {o.org_name}
                </span>
              ))}
            </div>
          </section>
        )}

      </main>
      <SiteFooter />
    </div>
  );
}
