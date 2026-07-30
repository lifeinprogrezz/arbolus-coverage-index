import Link from "next/link";
import { db } from "@/lib/db";
import { redactQuote } from "@/lib/mask";

export const dynamic = "force-dynamic";

// Contributor activation loop (build spec §7.5) — C1's surface, built not
// prose: the four always-on humanless loops that spend no recruiting money,
// plus the R0 offer card. Compounding metrics are [SIMULATED] (invites are
// drafted-never-sent, the reservoir base is synthetic) and every metric
// displays its compounding threshold explicitly.

const UNLOCK_STEPS = [
  { n: 1, label: "Land on the per-vendor conversion page", note: "destination for evidence-anchored invites — never a magnet" },
  { n: 2, label: "Verify with a workplace email", note: "their existing Persona flow; ineligible signups blocked with reasons" },
  { n: 3, label: "First review — the one R0 pays a named bounty for", note: "uncovered companies only" },
  { n: 4, label: "Review ~4 more tools to unlock rewards", note: "the spillover: one targeted recruit ships ~4 reviews on vendors nobody targeted" },
  { n: 5, label: "Invite colleagues — pays on THEIR completed reviews", note: "their live $10 mechanic; a niche vendor's customers cluster inside accounts" },
];

// [SIMULATED] loop metrics — thresholds rendered next to every value
const METRICS = [
  { name: "Referral coefficient", value: "1.18", threshold: "> 1 = compounding", state: "above", detail: "new contributors per acquired contributor, invite loop only" },
  { name: "Reservoir hit-rate", value: "31%", threshold: "rising run-over-run", state: "above", detail: "share of a gap answered internally before any cold work starts" },
  { name: "Dormant reactivation", value: "9%", threshold: "> 0 at zero CAC", state: "above", detail: "dormant experts re-prompted when the index newly maps their org" },
  { name: "Spillover ratio", value: "~4×", threshold: "reviews beyond the targeted vendor per recruit", state: "above", detail: "first-hand n=1: one signup produced six reviews" },
];

export default async function LoopPage() {
  // drafts render NAME-REDACTED — same masking contract as the book
  const { data: rawDrafts } = await db()
    .from("outreach_drafts")
    .select("channel, subject, body, drafted_at, sent, candidates(full_name)")
    .order("drafted_at", { ascending: false })
    .limit(6);
  const drafts = (rawDrafts ?? []).map((d) => {
    const name = (d.candidates as { full_name?: string } | null)?.full_name ?? null;
    return {
      channel: d.channel,
      sent: d.sent,
      subject: redactQuote(d.subject, name),
      body: redactQuote(d.body, name),
    };
  });

  return (
    <div className="page-grain min-h-screen">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold !text-ink no-underline">Coverage Index</Link>
            <span className="pill bg-city-barcelona">activation loop</span>
          </div>
          <span className="pill bg-city-sanjose">[SIMULATED] — invites drafted, never sent · reservoir synthetic</span>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <p className="max-w-2xl text-sm text-subtle">
          Challenge 1&rsquo;s continuous engine: mapping is universal, spend is prioritized —
          and reviews flow through four always-on loops that spend no recruiting money.
          The engine drafts; <strong>it never authors contributor content</strong>.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {/* R0 offer card */}
          <section className="rounded-lg border border-violet-100 bg-violet-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-ink">The offer — one scoped change</h2>
              <span className="pill bg-city-newyork">R0</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-md border border-line bg-card p-4">
                <div className="provenance">today · ongoing</div>
                <div className="metric mt-1 text-xl text-ink">$1–5 / view</div>
                <p className="mt-1 text-xs text-subtle">unknowable total · $100 payout floor · contingent on clients reading you</p>
              </div>
              <div className="rounded-md border border-violet-200 bg-card p-4 shadow-[var(--shadow-glow-violet)]">
                <div className="provenance">first review · uncovered companies only</div>
                <div className="metric mt-1 text-xl text-violet-link">$25–50 flat</div>
                <p className="mt-1 text-xs text-subtle">named upfront · paid on completion in a stated number of days · no floor for the first payout</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-subtle-deep">
              A setting their T&amp;C&rsquo;s variable-pricing clause already permits; ships as one A/B arm
              of the two-week experiment — the data decides it. Scarcity-priced: rich coverage ⇒ $0 bounty.
            </p>
          </section>

          {/* compounding metrics */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-ink">
              Compounding proof <span className="pill ml-1 bg-city-sanjose">[SIMULATED]</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {METRICS.map((m) => (
                <div key={m.name} className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-card)]">
                  <div className="text-xs font-medium text-subtle">{m.name}</div>
                  <div className="metric mt-1 text-2xl text-ink">{m.value}</div>
                  <div className="metric mt-0.5 text-[11px] text-city-london">{m.threshold}</div>
                  <p className="mt-1 text-[11px] leading-snug text-subtle">{m.detail}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* 5-review unlock flow */}
        <section className="mt-10">
          <h2 className="mb-3 text-base font-semibold text-ink">The activation flow</h2>
          <div className="flex flex-col gap-0">
            {UNLOCK_STEPS.map((s) => (
              <div key={s.n} className="flex items-start gap-4 border-l-2 border-violet-100 pb-4 pl-4 last:pb-0">
                <span className="metric -ml-[27px] flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-xs text-violet-link ring-4 ring-ground">
                  {s.n}
                </span>
                <div>
                  <span className="text-sm font-medium text-ink">{s.label}</span>
                  <span className="ml-2 text-xs text-subtle">{s.note}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* drafted invites */}
        <section className="mt-10">
          <h2 className="mb-3 text-base font-semibold text-ink">
            Invite queue <span className="metric text-sm text-subtle">(drafted — sent: never)</span>
          </h2>
          {(drafts ?? []).length === 0 ? (
            <div className="rounded-md border border-line bg-card p-5 text-sm text-subtle shadow-[var(--shadow-card)]">
              No drafts yet — the composer stage writes evidence-anchored drafts here after a map run
              (next build step). Every draft carries its evidence line, the compliance wrapper, and a
              <span className="metric"> sent=false</span> flag the prototype never flips.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {(drafts ?? []).map((d, i) => (
                <details key={i} className="rounded-md border border-line bg-card shadow-[var(--shadow-card)]">
                  <summary className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm">
                    <span className="pill bg-city-sanjose">{d.channel}</span>
                    <span className="text-ink">{d.subject}</span>
                    <span className="metric ml-auto text-xs text-subtle">sent: {String(d.sent)}</span>
                  </summary>
                  <div className="whitespace-pre-wrap border-t border-line px-4 py-3 text-sm text-ink-60">
                    {d.body}
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
