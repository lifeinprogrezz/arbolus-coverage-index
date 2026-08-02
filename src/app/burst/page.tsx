import { db } from "@/lib/db";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";
import CoLogo from "@/components/ui/co-logo";
import InfoHint from "@/components/ui/info-hint";
import { vendorName } from "../vendor-name";
import Assume, { AssumeTag } from "./assume";
import VendorPicker from "./vendor-picker";
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
    detail: "Only where email failed. About a dollar a letter.",
  },
  {
    when: "Day 20–30",
    what: "If day 20 is short, raise the bounty",
    detail:
      "The budget is approved up front. Asking the vendor to introduce us is a human-run last resort, and it gets labelled as sourced that way.",
  },
  {
    when: "Day 30",
    what: "The clock closes",
    detail:
      "20 verified, or the funnel shows exactly which stage fell short — and the next burst starts from what this one learned.",
  },
];

const WALK = [
  {
    stage: "Experts we already have",
    origin: "internal",
    math: "companies in the book × our experts there × how many say yes",
    yield_: "~3",
    assumption:
      "2–6 matches per vendor in their sweet spot. The base is simulated, and the ratio is on screen. This line is the direct ask to our own experts — the introductions they might make to colleagues are left out of the math on purpose: upside, not counted.",
  },
  {
    stage: "Email the people we can name",
    origin: "external",
    math: "5–30 people × 80% we find an address × 92% delivered × reply rate × 55% finish × 80% verified",
    yield_: "~0.5–1",
    assumption:
      "The reply rate decides this line: 3% cold gives about 0.3, 10% is the optimistic case because the money is named up front.",
  },
  {
    stage: "Colleague invites",
    origin: "peer",
    math: "invites per person who joined, paid only when their review lands",
    yield_: "~2–6",
    assumption: "0.5–1.5 invites per person who joined, the way GLG pays on results.",
  },
  {
    stage: "Through their communities",
    origin: "external",
    math: "one-off deal per community, spend capped",
    yield_: "~3",
    assumption: "2–6 per burst.",
  },
  {
    stage: "Letters in the post",
    origin: "external",
    math: "~150 letters ≈ $135",
    yield_: "~1–4",
    assumption:
      "About 0.8 at the usual 1% cold rate. The 4 assumes a lift from naming their own evidence, which we have not tested.",
  },
];

const COSTS = [
  {
    line: "Map run (11 lanes)",
    amount: "pennies–$1 / vendor",
    basis: "free sources plus one paid search API · every lane's cost is recorded and shown",
    assumption: null,
    note: null,
  },
  {
    line: "Bounties",
    amount: "20 × $50 = $1,000",
    basis:
      "20 contributors at the $50 bounty tier · a company someone had to ask for sits in the thin or near-empty tiers by definition",
    assumption: null,
    note: null,
  },
  {
    line: "Review cost, fully loaded",
    amount: "×2–3 the bounty ⇒ $2,000–3,000",
    basis:
      "worst case, and it replaces the bounty line · Arbolus's existing per-review checks and fraud tooling, with no extra person per review",
    assumption: null,
    note: null,
  },
  {
    line: "Through their communities",
    amount: "≤$300 cap",
    basis: "one-off per community, spread across every burst we run in that niche",
    assumption: "The cap is an assumption, not a quoted price.",
    note: null,
  },
  {
    line: "Letters in the post",
    amount: "$135",
    basis: "~150 letters through a print API",
    assumption: null,
    note: null,
  },
  {
    line: "Hosting and models",
    amount: "~$50",
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
        note: "clients are already served · $0 approved",
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
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <CoLogo name={vendor?.name ?? "?"} domain={vendor?.domain} size={28} />
            <span className="text-title text-ink">
              {vendor ? vendorName(vendor.name) : "—"}
            </span>
            <span className="provenance">{vendor?.domain}</span>
          </div>

          <div className="mt-3">
            <VendorPicker
              vendors={(vendors ?? []).map((v) => ({ name: v.name, domain: v.domain }))}
              current={vendor?.domain}
            />
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

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["people we can name", b.seeds ?? 0],
                ["companies we can reach", b.keys ?? 0],
                ["experts we already have", b.reservoir_hits ?? 0],
                ["reviews today", vendor?.coverage_now ?? 0],
              ] as [string, number][]
            ).map(([k, v]) => (
              <div key={k}>
                <span className="provenance block">{k}</span>
                <span className="metric mt-0.5 block text-page text-ink">{v}</span>
              </div>
            ))}
          </div>
        </section>

        {/* what the engine is held to — the brief's metrics ask, in-product */}
        <section className="pane reveal reveal-d1 relative mt-4 overflow-hidden">
          <span className="absolute right-3.5 top-3.5">
            <InfoHint align="right">
              Hitting 20 in 30 days only counts if the reviews get read — reads pay
              the contributor and lead to expert calls — and if opt-outs stay below
              what manual outreach produces today. A fast burst that annoys people
              fails.
            </InfoHint>
          </span>
          <div className="grid divide-y divide-line sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {(
              [
                ["north star", "Time to coverage", "days from demand to 20 verified · target ≤ 30"],
                ["client value", "Read rate", "clients reading these reviews, then booking calls"],
                ["guardrail", "Opt-outs", "below their manual baseline, always"],
              ] as [string, string, string][]
            ).map(([k, name, d]) => (
              <div key={k} className="px-5 py-4">
                <span className="eyebrow">{k}</span>
                <span className="mt-1 block text-control font-medium text-ink">{name}</span>
                <span className="mt-0.5 block text-dense text-subtle">{d}</span>
              </div>
            ))}
          </div>
        </section>

        {/* the core argument — full width */}
        <section className="reveal reveal-d2 mt-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <h2 className="text-title text-ink">The walk to 20</h2>
            <AssumeTag />
            <span className="provenance">
              the general base case — the sliders below run it on this
              vendor&rsquo;s real book
            </span>
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
                      <td className="px-3.5 py-2.5">
                        <span className="block font-medium text-ink">{w.stage}</span>
                        <span className="provenance">{w.origin}</span>
                      </td>
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
                      <span className="block">1 · give it more time and map again</span>
                      <span className="block">2 · raise the bounty — the one lever with proven effect</span>
                      <span className="block">
                        3 · the vendor introduces us — last resort, labelled vendor-sourced
                      </span>
                    </td>
                    <td className="metric py-2.5 pl-3.5 pr-5 text-right text-success-text">
                      → 20
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="mt-8">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <span className="flex items-center gap-2">
                <h2 className="text-title text-ink">Move the assumptions</h2>
                <AssumeTag />
                <span className="provenance">
                  running on {vendor ? vendorName(vendor.name) : "this vendor"}&rsquo;s
                  real book
                </span>
              </span>
            </div>
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
                    {i === PLAYBOOK.length - 1 ? (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-400 shadow-[var(--shadow-glow-violet)]">
                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
                          <path
                            d="M2.5 6.5 5 9l4.5-6"
                            stroke="white"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </span>
                    ) : (
                      <span className="metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-micro text-violet-link">
                        {i + 1}
                      </span>
                    )}
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

          </section>

          {/* cost per burst — sits beside the playbook: when things happen | what they cost */}
          <section className="reveal reveal-d3">
            <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h2 className="text-title text-ink">Cost per burst</h2>
              <AssumeTag />
              <span className="provenance">
                all figures in USD
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
                        ≈ $1,500 base · $3,000–3,500 fully loaded
                      </td>
                      <td className="py-2.5 pl-3.5 pr-5 text-dense text-subtle">
                        ⇒ $75–170 for each verified contributor
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* closing pair: their baseline | where this goes */}
        {/* by hand vs the engine — same rows, honest comparison */}
        <section className="reveal reveal-d4 mt-10">
          <h2 className="mb-4 text-title text-ink">By hand vs the engine</h2>
          <div className="pane overflow-hidden">
            <div className="tracker-scroll overflow-x-auto">
              <table className="w-full border-collapse text-control">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="w-[150px] px-3.5 py-3" />
                    <th className="border-r border-line/70 px-3.5 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">Doing it by hand</span>
                        <span className="pill bg-city-sanjose">their baseline</span>
                        <InfoHint>
                          Derived from Arbolus&rsquo;s own published numbers on
                          the manual review operation — offered as their number
                          to correct, not asserted about their internals.
                        </InfoHint>
                      </span>
                    </th>
                    <th className="bg-violet-50/60 px-3.5 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">The engine, at scale</span>
                        <span className="pill bg-city-newyork">100 bursts / yr</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "verified reviews",
                        "≈3,100 a year (12.4 a day)",
                        "~2,000 a year",
                      ],
                      [
                        "where they land",
                        "where recruiting is easiest — the well-known head",
                        "only where a client asked and found nothing — the tail",
                      ],
                      [
                        "one empty company",
                        "joins the human queue — weeks to months",
                        "a 30-day clock, many companies in parallel",
                      ],
                      [
                        "people",
                        "2–3 full-time",
                        "no dedicated team · escalation-only checks",
                      ],
                      [
                        "cost per verified",
                        "$40–100 all in",
                        "$75–170 on the first burst, falling each run",
                      ],
                      [
                        "the spend",
                        "fixed salaries · one queue",
                        "$150–350K a year, switchable · many bursts at once",
                      ],
                    ] as [string, string, string][]
                  ).map(([k, hand, engine]) => (
                    <tr key={k} className="border-b border-line">
                      <td className="w-[170px] whitespace-nowrap px-3.5 py-3 font-mono text-caption uppercase tracking-[0.06em] text-subtle">
                        {k}
                      </td>
                      <td className="metric border-r border-line/70 px-3.5 py-3 text-dense text-ink-60">
                        {hand}
                      </td>
                      <td className="metric bg-violet-50/60 px-3.5 py-3 text-dense text-ink">
                        {engine}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="flex items-baseline gap-2 border-t border-line px-4 py-2.5 text-dense text-subtle-deep">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 shrink-0 -translate-y-[1px] rounded-full bg-violet-400"
              />
              The engine adds the tail the pod can&rsquo;t reach; the pod becomes
              its escalation tier. And 20,000 companies does not mean 20,000
              bursts — covered vendors cost $0, the free loops carry the rest.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
