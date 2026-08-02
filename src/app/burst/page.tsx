import Link from "next/link";
import { db } from "@/lib/db";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";
import CoLogo from "@/components/ui/co-logo";
import InfoHint from "@/components/ui/info-hint";
import { vendorName } from "../vendor-name";
import Assume from "./assume";
import WalkSliders from "./walk-sliders";

export const dynamic = "force-dynamic";

// Burst view (build spec §7.4): the 30-day clock, the trigger branch read
// from the REAL book, the §5.1 walk-to-20 with every invented rate labelled,
// and the §9.4b cost table.

const PLAYBOOK = [
  {
    when: "Hour 0",
    what: "Look the company up, pick the path",
    detail:
      "Warm book: start recruiting now. Thin book: run a quick map first, which takes hours. Cold: run a full map and the clock runs longer.",
  },
  {
    when: "Day 0–2",
    what: "Ask the experts we already have",
    detail:
      "Already verified, already paid, already answering us. The cheapest people to reach.",
  },
  {
    when: "Day 1–5",
    what: "Email the people we can name",
    detail:
      "Each email names the bounty, says how long it takes, and gives the date they get paid.",
  },
  {
    when: "Day 3–15",
    what: "Ask people who joined to invite colleagues",
    detail:
      "Only after they finish a verified review. This is Arbolus's live $10 invite mechanic.",
  },
  {
    when: "Day 5–20",
    what: "Show up where these users already gather",
    detail: "The vendor's own sign-up page is where they land.",
  },
  {
    when: "Day 15–25",
    what: "Post a letter to named decision makers",
    detail: "Only where email failed. About €1 a letter.",
  },
  {
    when: "Day 20–30",
    what: "If day 20 is short, raise the bounty",
    detail:
      "The budget is approved up front. Asking the vendor to introduce us is a human-run last resort, and it gets labelled as sourced that way.",
  },
];

const WALK = [
  {
    stage: "Experts we already have",
    math: "companies in the book × our experts there × how many say yes",
    yield_: "~3",
    assumption:
      "2–6 matches per vendor in their sweet spot. The base is simulated, and the ratio is on screen.",
  },
  {
    stage: "Email the people we can name",
    math: "5–30 people × 80% we find an address × 92% delivered × reply rate × 55% finish × 80% verified",
    yield_: "~0.5–1",
    assumption:
      "The reply rate decides this line: 3% cold gives about 0.3, 10% is the optimistic case because the money is named up front.",
  },
  {
    stage: "Colleague invites",
    math: "invites per person who joined, paid only when their review lands",
    yield_: "~2–6",
    assumption: "0.5–1.5 invites per person who joined, the way GLG pays on results.",
  },
  {
    stage: "Placements in their communities",
    math: "one-off deal per community, spend capped",
    yield_: "~3",
    assumption: "2–6 per burst.",
  },
  {
    stage: "Letters in the post",
    math: "~150 letters ≈ €125",
    yield_: "~1–4",
    assumption:
      "About 0.8 at the usual 1% cold rate. The 4 assumes a lift from naming their own evidence, which we have not tested.",
  },
];

const COSTS = [
  {
    line: "Map run (11 lanes)",
    amount: "pennies–€1 / vendor",
    basis: "free sources plus one paid search API · every lane's cost is recorded and shown",
    assumption: null,
    note: null,
  },
  {
    line: "Bounties",
    amount: "20 × ~€50 ≈ €1,000",
    basis:
      "20 contributors at the $50 bounty tier · a company someone had to ask for sits in the thin or near-empty tiers by definition",
    assumption: null,
    note: "bounty ≈ $50 tier",
  },
  {
    line: "Review cost, fully loaded",
    amount: "×2–3 the bounty ⇒ €2,000–3,000",
    basis:
      "worst case, and it replaces the bounty line · Arbolus's existing per-review checks and fraud tooling, with no extra person per review",
    assumption: null,
    note: null,
  },
  {
    line: "Community placements",
    amount: "≤€300 cap",
    basis: "one-off per community, spread across every burst we run in that niche",
    assumption: "The cap is an assumption, not a quoted price.",
    note: null,
  },
  {
    line: "Letters in the post",
    amount: "€125",
    basis: "~150 letters through a print API",
    assumption: null,
    note: null,
  },
  {
    line: "Hosting and models",
    amount: "~€50",
    basis: "serverless hosting plus the model that sorts the evidence",
    assumption: null,
    note: null,
  },
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
    .select("name, domain, book_state, hq_country, coverage_now, coverage_simulated")
    .order("last_mapped_at", { ascending: false, nullsFirst: false });
  const vendor =
    (vendors ?? []).find((v) => v.domain === vendorParam) ?? (vendors ?? [])[0];
  const b = (vendor?.book_state ?? {}) as {
    seeds?: number;
    keys?: number;
    reservoir_hits?: number;
  };
  const depth = (b.seeds ?? 0) + (b.reservoir_hits ?? 0);
  const covered = (vendor?.coverage_now ?? 0) >= 20;
  const branch = covered
    ? {
        label: "Well covered — nothing to fill, nothing to spend",
        wash: "bg-city-london/50",
        note: "clients are already served · €0 approved",
        hint: "The request closes with no budget at all. We price a well-covered vendor at zero, so the top of the ladder spends nothing.",
      }
    : depth >= 8
      ? {
          label: "Warm book — start recruiting now",
          wash: "bg-city-london/50",
          note: "people and experts ready · first emails in hours",
          hint: "Enough named people and in-network experts to start reaching out straight away, with no mapping pass first.",
        }
      : depth >= 3
        ? {
            label: "Thin book — quick map first",
            wash: "bg-city-newdelhi/50",
            note: "re-map in minutes for pennies, then recruit",
            hint: "Below about 8 entries the burst opens with a re-map. It runs in minutes for pennies, and recruiting starts from whatever it finds.",
          }
        : {
            label: "Cold — full map, longer clock",
            wash: "bg-city-sanjose/60",
            note: "nothing public to work from · the clock honestly runs longer",
            hint: "With no public trace to work from, a higher bounty and asking people to opt in carry more of the walk to 20.",
          };

  return (
    <div className="page-grain min-h-screen">
      <AppHeader variant="paper" />

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        {/* trigger card */}
        <section className="pane reveal p-5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="pill bg-city-newyork">demand event</span>
            <span className="rounded-full bg-city-sanjose/80 px-2 py-px font-mono text-micro uppercase tracking-[0.05em] text-ink-70">
              simulated
            </span>
            <InfoHint>
              Arbolus&rsquo;s public API has no way to write this event, which we
              checked directly. So the trigger is simulated. Everything after it
              reads the real book.
            </InfoHint>
            <span className="text-dense text-subtle">
              a client opened a company with no coverage
            </span>
            <span className="metric ml-auto text-dense text-subtle">
              target <span className="font-medium text-ink">20</span> verified · clock{" "}
              <span className="font-medium text-ink">30d</span>
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CoLogo name={vendor?.name ?? "?"} domain={vendor?.domain} size={28} />
            <span className="text-title text-ink">
              {vendor ? vendorName(vendor.name) : "—"}
            </span>
            <span className="provenance">{vendor?.domain}</span>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {(vendors ?? []).map((v) => (
                <Link
                  key={v.domain}
                  href={`/burst?vendor=${v.domain}`}
                  className={`pill no-underline transition-colors active:translate-y-px ${
                    v.domain === vendor?.domain
                      ? "bg-city-barcelona"
                      : "bg-ground-tint hover:bg-ground-tint-hover"
                  }`}
                >
                  {vendorName(v.name)}
                </Link>
              ))}
            </div>
          </div>

          {/* branch banner — full-width strip, washed by branch */}
          <div className={`-mx-5 mt-4 border-y border-line/70 px-5 py-2.5 ${branch.wash}`}>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-caption font-medium uppercase tracking-[0.06em] text-ink">
                {branch.label}
              </span>
              <span className="text-dense text-ink-60">{branch.note}</span>
              <InfoHint align="right">{branch.hint}</InfoHint>
            </div>
          </div>

          <div className="dg mt-4">
            <span className="dg-k">people we can name</span>
            <span className="dg-v metric">{b.seeds ?? 0}</span>
            <span className="dg-k">companies we can reach</span>
            <span className="dg-v metric">{b.keys ?? 0}</span>
            <span className="dg-k">experts already ours</span>
            <span className="dg-v metric">{b.reservoir_hits ?? 0}</span>
            <span className="dg-k">reviews today</span>
            <span className="dg-v metric">{vendor?.coverage_now ?? 0}</span>
          </div>
        </section>

        {/* what the engine is held to — the brief's metrics ask, in-product */}
        <section className="pane reveal reveal-d1 mt-4 px-5 py-3.5">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="eyebrow">north star</span>
              <span className="text-control font-medium text-ink">Time to coverage</span>
              <span className="text-dense text-subtle">
                days from demand to 20 verified · target ≤ 30
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="eyebrow">client value</span>
              <span className="text-control font-medium text-ink">Read rate</span>
              <span className="text-dense text-subtle">
                clients reading these reviews, then booking calls
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
              <span className="eyebrow">guardrail</span>
              <span className="text-control font-medium text-ink">Opt-outs</span>
              <span className="text-dense text-subtle">below their manual baseline, always</span>
            </div>
            <InfoHint align="right">
              Hitting 20 in 30 days only counts if the reviews get read — reads pay
              the contributor and lead to expert calls — and if opt-outs stay below
              what manual outreach produces today. A fast burst that annoys people
              fails.
            </InfoHint>
          </div>
        </section>

        {/* the core argument — full width */}
        <section className="reveal reveal-d2 mt-8">
          <div className="mb-4 flex items-center gap-1.5">
            <h2 className="text-title text-ink">The walk to 20</h2>
            <InfoHint>
              The base case, with every made-up rate labelled as an assumption. We
              keep 80% of each line after verification, on every line except the
              experts we already have.
            </InfoHint>
          </div>
          <div className="pane overflow-hidden">
            <div className="tracker-scroll overflow-x-auto">
              <table className="w-full border-collapse text-control">
                <thead>
                  <tr className="border-b border-line text-left font-mono text-micro uppercase tracking-[0.08em] text-subtle">
                    <th className="px-3.5 py-2.5 font-medium">Stage</th>
                    <th className="px-3.5 py-2.5 font-medium">How it adds up</th>
                    <th className="py-2.5 pl-3.5 pr-5 text-right font-medium">
                      Expected
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {WALK.map((w) => (
                    <tr
                      key={w.stage}
                      className="border-b border-line align-top transition-colors hover:bg-ink/[.03]"
                    >
                      <td className="px-3.5 py-2.5 font-medium text-ink">{w.stage}</td>
                      <td className="px-3.5 py-2.5 text-dense text-subtle">
                        {w.math} <Assume>{w.assumption}</Assume>
                      </td>
                      <td className="metric py-2.5 pl-3.5 pr-5 text-right text-violet-link">
                        {w.yield_}
                      </td>
                    </tr>
                  ))}
                  <tr className="border-b border-line bg-ground-tint align-top">
                    <td className="px-3.5 py-2.5 font-semibold text-ink">Base case</td>
                    <td className="px-3.5 py-2.5 text-dense text-subtle">
                      80% kept after verification on every line except the experts we
                      already have · the low ends add back up to ~5–7
                    </td>
                    <td className="metric py-2.5 pl-3.5 pr-5 text-right font-semibold text-ink">
                      ~8–18
                    </td>
                  </tr>
                  <tr className="align-top">
                    <td className="px-3.5 py-2.5 font-medium text-ink">If we fall short</td>
                    <td className="px-3.5 py-2.5 text-dense text-subtle">
                      (1) run the clock longer and re-map · (2) raise the bounty, the
                      one lever we know works · (3) ask the vendor to introduce us, a
                      last resort that gets labelled as such
                    </td>
                    <td className="metric py-2.5 pl-3.5 pr-5 text-right text-success-text">
                      → 20
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="mt-2.5 text-pretty text-dense text-subtle">
            On these assumptions the base case lands between 8 and 18. Raising the
            bounty closes the rest of the way to 20: reachable, not guaranteed, and
            if it misses the funnel names the stage that fell short.
          </p>
          <div className="mt-5">
            <WalkSliders
              defaultSeeds={b.seeds ?? 20}
              defaultReservoir={b.reservoir_hits ?? 3}
            />
          </div>
        </section>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.15fr]">
          {/* playbook timeline */}
          <section className="reveal reveal-d3">
            <h2 className="mb-4 text-title text-ink">30-day playbook</h2>
            <div className="flex flex-col">
              {PLAYBOOK.map((p, i) => (
                <div key={p.when} className="flex gap-3">
                  <span className="metric w-16 shrink-0 pt-1 text-right text-caption text-violet-link">
                    {p.when}
                  </span>
                  <div className="flex flex-col items-center">
                    <span className="metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-micro text-violet-link">
                      {i + 1}
                    </span>
                    {i < PLAYBOOK.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className={`pt-0.5 ${i < PLAYBOOK.length - 1 ? "pb-5" : ""}`}>
                    <span className="text-control text-ink">{p.what}</span>
                    <span className="ml-1.5 inline-flex align-middle">
                      <InfoHint>{p.detail}</InfoHint>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="provenance mt-4">
              results write back to the index · the budget moves between channels each
              run
            </p>
          </section>

          {/* cost per burst — sits beside the playbook: when things happen | what they cost */}
          <section className="reveal reveal-d3">
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-title text-ink">Cost per burst</h2>
              <span className="provenance">
                engine costs in EUR · contributor rewards in USD
              </span>
            </div>
            <div className="pane self-start overflow-hidden">
              <div className="tracker-scroll overflow-x-auto">
                <table className="w-full border-collapse text-control">
                  <tbody>
                    {COSTS.map((c) => (
                      <tr
                        key={c.line}
                        className="border-b border-line align-top transition-colors hover:bg-ink/[.03]"
                      >
                        <td className="px-3.5 py-2.5 font-medium text-ink">{c.line}</td>
                        <td className="px-3.5 py-2.5 text-dense">
                          <span className="metric whitespace-nowrap text-violet-link">
                            {c.amount}
                          </span>
                          {c.assumption && (
                            <span className="ml-1.5">
                              <Assume>{c.assumption}</Assume>
                            </span>
                          )}
                          {c.note && (
                            <span className="provenance mt-0.5 block whitespace-nowrap">
                              {c.note}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 pl-3.5 pr-5 text-dense text-subtle">
                          {c.basis}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-ground-tint align-top">
                      <td className="px-3.5 py-2.5 font-semibold text-ink">
                        Total per burst
                      </td>
                      <td className="metric px-3.5 py-2.5 text-dense font-medium text-ink">
                        ≈ €1,500 base · €3,000–3,500 fully loaded
                      </td>
                      <td className="py-2.5 pl-3.5 pr-5 text-dense text-subtle">
                        ⇒ €75–170 for each verified contributor
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* closing pair: their baseline | where this goes */}
        <div className="reveal reveal-d4 mt-8 grid gap-6 lg:grid-cols-2">
          {/* manual pod */}
          <div className="pane p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-control font-semibold text-ink">
                    Doing it by hand
                  </span>
                  <span className="pill bg-city-sanjose">their baseline</span>
                </div>
                <div className="dg mt-3">
                  <span className="dg-k">output</span>
                  <span className="dg-v metric">12.4 verified / day</span>
                  <span className="dg-k">people</span>
                  <span className="dg-v metric">2–3 full-time</span>
                  <span className="dg-k">cost each</span>
                  <span className="dg-v metric">€40–100 all in</span>
                </div>
                <p className="mt-3 text-pretty text-caption leading-snug text-subtle">
                  The first burst costs about the same per contributor. What differs:
                  money we can switch on and off instead of fixed salaries, many bursts
                  at once instead of one queue, a cost that falls with every run, and
                  spend only on companies a client already asked for.
                </p>
              </div>

              {/* at scale */}
              <div className="rounded-xl border border-violet-100 bg-violet-50 p-5">
                <div className="eyebrow">at scale</div>
                <div className="metric mt-1.5 text-display text-ink">
                  €150–350K
                  <span className="text-title font-normal text-ink-60"> / yr</span>
                </div>
                <p className="mt-1 text-dense text-ink-60">
                  100 companies triggered · ~2,000 verified contributors
                </p>
                <p className="mt-2.5 text-pretty text-dense text-subtle-deep">
                  20,000 companies does not mean 20,000 bursts. We only pay bounties
                  where a client asked and coverage was missing, well-covered vendors
                  cost €0, and the free activation loops carry the rest of the
                  catalogue.
                </p>
              </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
