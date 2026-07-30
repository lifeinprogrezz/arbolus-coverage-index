import Link from "next/link";
import { db } from "@/lib/db";
import WalkSliders from "./walk-sliders";

export const dynamic = "force-dynamic";

// Burst view (build spec §7.4, static-first per the locked cut order):
// the 30-day clock, the trigger branch read from the REAL book, the §5.1
// walk-to-20 with every invented rate labelled, and the §9.4b cost table.

const PLAYBOOK = [
  { when: "Hour 0", what: "Index lookup — branch on book state: warm → recruit now · thin → emergency map (hours) · cold → full map, longer clock" },
  { when: "Day 0–2", what: "Reservoir activation first — already verified, already paid, already responsive; cheapest supply" },
  { when: "Day 1–5", what: "Seed outreach — evidence-anchored email, named flat bounty, bounded effort, stated payout date" },
  { when: "Day 3–15", what: "Colleague invites from each converted seed — gated on a completed verified review (their live $10 mechanic)" },
  { when: "Day 5–20", what: "Community placement at the vendor's watering holes; per-vendor conversion page as destination" },
  { when: "Day 15–25", what: "Physical-mail tail-closer to named decision-makers where email failed (~€1/piece)" },
  { when: "Day 20–30", what: "Day-20 shortfall auto-escalates the bounty tier (budget pre-authorized); vendor-mediated only as human-run, sourcing-labelled last resort" },
];

const WALK = [
  { stage: "Reservoir activation", math: "index orgs × experts-at-org × ask-conversion — synthetic base, ratio on screen", yield_: "~3", assumption: "2–6 hits/vendor in their sweet spot" },
  { stage: "Seed outreach", math: "5–30 seeds × 80% resolve × 92% deliver × reply × 55% complete × 80% verification pass", yield_: "~0.5–1", assumption: "reply is the binding lever: 3% cold ⇒ ~0.3; 10% optimistic (prepaid-vs-promised gap)" },
  { stage: "Colleague invites", math: "coefficient on CONVERTED seeds+reservoir, CPA-conditional (GLG-style)", yield_: "~2–6", assumption: "0.5–1.5 per converter" },
  { stage: "Community placement", math: "per-community one-off BD, capped spend", yield_: "~3", assumption: "2–6/burst" },
  { stage: "Physical mail", math: "~150 letters ≈ €125", yield_: "~1–4", assumption: "~0.8 at the 1% cold baseline; 4 assumes untested evidence-anchored uplift" },
];

const COSTS = [
  { line: "Map run (10 lanes)", amount: "pennies–€1/vendor", basis: "free APIs + Serper; journaled per-lane cost is a UI element" },
  { line: "Bounties", amount: "20 × ~€50 ≈ €1,000", basis: "a TRIGGERED company sits in the thin/near-zero scarcity tiers by definition" },
  { line: "Fully-loaded review cost", amount: "×2–3 on bounty ⇒ €2,000–3,000 worst case (replaces the bounty line)", basis: "Arbolus's inherited per-review gates + automated fraud tooling — no NEW per-review human" },
  { line: "Community placement", amount: "≤€300 cap [ASSUMPTION]", basis: "one-off per community, amortized across bursts in the niche" },
  { line: "Physical mail", amount: "€125", basis: "~150 letters, print-API" },
  { line: "Infra", amount: "~€50", basis: "serverless + LLM classification" },
];

export default async function BurstPage({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const { vendor: vendorParam } = await searchParams;
  const supa = db();
  const { data: vendors } = await supa
    .from("vendors")
    .select("name, domain, book_state, hq_country")
    .order("last_mapped_at", { ascending: false, nullsFirst: false });
  const vendor =
    (vendors ?? []).find((v) => v.domain === vendorParam) ?? (vendors ?? [])[0];
  const b = (vendor?.book_state ?? {}) as {
    seeds?: number;
    keys?: number;
    reservoir_hits?: number;
  };
  const depth = (b.seeds ?? 0) + (b.reservoir_hits ?? 0);
  const branch =
    depth >= 8
      ? { label: "WARM BOOK — recruit now", pill: "bg-city-london", note: "seeds + reservoir hits are ready; outreach drafts in hours, not weeks" }
      : depth >= 3
      ? { label: "THIN BOOK — emergency map first", pill: "bg-city-newdelhi", note: "a re-map runs in minutes for pennies, then recruit from what it finds" }
      : { label: "COLD — full map, longer clock", pill: "bg-city-sanjose", note: "no public footprint: scarcity pricing + consent-first capture carry more of the walk; the clock honestly extends" };

  return (
    <div className="page-grain min-h-screen">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold !text-ink no-underline">Coverage Index</Link>
            <span className="pill bg-city-barcelona">burst</span>
          </div>
          <span className="pill bg-city-sanjose">trigger simulated — no write path exists on their API (probe-proven)</span>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        {/* trigger card */}
        <section className="rounded-lg border border-line bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill bg-city-newyork">demand event · simulated</span>
            <span className="text-sm text-subtle">a client opened a company with no coverage:</span>
            <span className="font-semibold text-ink">{vendor?.name ?? "—"}</span>
            <span className="provenance">{vendor?.domain}</span>
            <span className="metric ml-auto text-sm">target <span className="text-violet-link">20</span> verified · clock <span className="text-violet-link">30d</span></span>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className={`pill ${branch.pill}`}>{branch.label}</span>
            <span className="text-sm text-subtle">{branch.note}</span>
          </div>
          <div className="metric mt-3 text-xs text-subtle">
            book: {b.seeds ?? 0} seeds · {b.keys ?? 0} org keys · {b.reservoir_hits ?? 0} reservoir hits
          </div>
          <div className="mt-2 flex gap-2">
            {(vendors ?? []).map((v) => (
              <Link key={v.domain} href={`/burst?vendor=${v.domain}`} className={`pill no-underline ${v.domain === vendor?.domain ? "bg-city-barcelona" : "bg-city-sanjose"}`}>
                {v.name}
              </Link>
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1.1fr]">
          {/* playbook timeline */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-ink">The 30-day playbook</h2>
            <div className="flex flex-col">
              {PLAYBOOK.map((p, i) => (
                <div key={i} className="flex gap-4 border-l-2 border-violet-100 pb-5 pl-4 last:pb-0">
                  <span className="metric w-20 shrink-0 text-xs text-violet-link">{p.when}</span>
                  <span className="text-sm text-ink-60">{p.what}</span>
                </div>
              ))}
            </div>
            <p className="provenance mt-3">every stage writes outcomes back to the index — the learning loop reallocates channel budget per run</p>
          </section>

          {/* walk to 20 */}
          <section>
            <h2 className="mb-3 text-base font-semibold text-ink">The walk to 20 — base case, every rate labelled</h2>
            <div className="overflow-x-auto rounded-md border border-line bg-card shadow-[var(--shadow-card)]">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-subtle">
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Arithmetic</th>
                    <th className="px-3 py-2 text-right">Central</th>
                  </tr>
                </thead>
                <tbody>
                  {WALK.map((w) => (
                    <tr key={w.stage} className="border-b border-line align-top last:border-0">
                      <td className="px-3 py-2 font-medium text-ink">{w.stage}</td>
                      <td className="px-3 py-2 text-xs text-subtle">
                        {w.math}
                        <div className="mt-0.5 text-warn-text">[ASSUMPTION] {w.assumption}</div>
                      </td>
                      <td className="metric px-3 py-2 text-right text-violet-link">{w.yield_}</td>
                    </tr>
                  ))}
                  <tr className="bg-ground-tint">
                    <td className="px-3 py-2 font-semibold text-ink">Base-case sum</td>
                    <td className="px-3 py-2 text-xs text-subtle">verification factor applies to every non-reservoir line; low ends re-sum to ~5–7</td>
                    <td className="metric px-3 py-2 text-right font-semibold text-ink">~8–18</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-medium text-ink">Miss branch</td>
                    <td className="px-3 py-2 text-xs text-subtle">
                      (1) extend clock + re-map · (2) escalate the bounty — scarcity elasticity is the proven lever · (3) vendor-mediated, sourcing-labelled, last resort
                    </td>
                    <td className="metric px-3 py-2 text-right text-city-london">→ 20</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-sm text-subtle">
              The honest sentence: the base case lands 8–18 on stated assumptions; the priced escalation
              branch closes to 20. 20 is <em>arithmetically reachable</em>, not guaranteed — and the
              funnel metrics name which stage missed.
            </p>
            <div className="mt-4">
              <WalkSliders
                defaultSeeds={b.seeds ?? 20}
                defaultReservoir={b.reservoir_hits ?? 3}
              />
            </div>
          </section>
        </div>

        {/* cost table */}
        <section className="mt-10">
          <h2 className="mb-3 text-base font-semibold text-ink">Per-burst cost vs the manual pod</h2>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="overflow-x-auto rounded-md border border-line bg-card shadow-[var(--shadow-card)]">
              <table className="w-full border-collapse text-sm">
                <tbody>
                  {COSTS.map((c) => (
                    <tr key={c.line} className="border-b border-line align-top last:border-0">
                      <td className="px-3 py-2 font-medium text-ink">{c.line}</td>
                      <td className="metric px-3 py-2 text-xs text-violet-link">{c.amount}</td>
                      <td className="px-3 py-2 text-xs text-subtle">{c.basis}</td>
                    </tr>
                  ))}
                  <tr className="bg-ground-tint font-semibold">
                    <td className="px-3 py-2 text-ink">Per-burst total</td>
                    <td className="metric px-3 py-2 text-xs text-ink">≈ €1,500 base · ≈ €3,000–3,500 fully-loaded worst case</td>
                    <td className="px-3 py-2 text-xs text-subtle">⇒ €75–170 per verified contributor</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-md border border-line bg-card p-4 shadow-[var(--shadow-card)]">
                <div className="text-sm font-medium text-ink">Pod baseline <span className="pill ml-1 bg-city-sanjose">their number to correct</span></div>
                <p className="mt-1 text-xs text-subtle">
                  12.4 verified/day at 2–3 ops FTE ⇒ €40–100/contributor loaded labor. At burst #1 the
                  engine is <em>comparable</em> on unit cost — the win is structural: variable incentive
                  vs fixed labor · parallel bursts vs a serial ceiling · CPA falls run-over-run · spend
                  demand-gated to companies a client already asked for.
                </p>
              </div>
              <div className="rounded-md border border-violet-100 bg-violet-50 p-4">
                <div className="text-sm font-medium text-ink">At scale</div>
                <p className="mt-1 text-xs text-subtle-deep">
                  100 triggered companies ≈ €150–350K/yr for ~2,000 verified contributors. The 20,000-company
                  goal is NOT 20,000 bursts: demand-gating makes bounty spend linear in DEMANDED gaps, and
                  scarcity pricing self-extinguishes — covered vendors drop to €0. The catalog is carried by
                  the zero-bounty activation loops.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
