import Link from "next/link";
import { db } from "@/lib/db";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";
import InfoHint from "@/components/ui/info-hint";
import { vendorName } from "../vendor-name";
import MetricTiles from "./metric-tiles";

export const dynamic = "force-dynamic";

// Contributor activation loop (build spec §7.5) — C1's surface, built not
// prose: the four always-on humanless loops that spend no recruiting money,
// plus the R0 offer card. Compounding metrics are [SIMULATED] (invites are
// drafted-never-sent, the reservoir base is synthetic).

const UNLOCK_STEPS = [
  {
    n: 1,
    label: "Land on the vendor's own sign-up page",
    note: null,
  },
  {
    n: 2,
    label: "Verify with a work email",
    note: "Arbolus's existing Persona check. Anyone who is not eligible is turned down with a reason.",
  },
  {
    n: 3,
    label: "First review, the one this offer pays for",
    note: "A named flat bounty, and only on companies with no coverage yet.",
  },
  {
    n: 4,
    label: "Review about 4 more tools you use to unlock rewards",
    note: "This is the spillover: one person we recruited on purpose leaves roughly four reviews nobody targeted.",
  },
  {
    n: 5,
    label: "Invite colleagues, and get paid when their reviews land",
    note: "Arbolus's live $10 mechanic. A niche vendor's users tend to sit in the same few accounts.",
  },
];

// [SIMULATED] loop metrics — thresholds rendered next to every value
const METRICS = [
  { name: "Invites per contributor", value: "1.18", threshold: "above 1 = it compounds", detail: "new contributors each one brings in" },
  { name: "Answered from our own experts", value: "31%", threshold: "should rise every run", detail: "gap covered from our own network first" },
  { name: "Quiet experts brought back", value: "9%", threshold: "anything above 0 is free", detail: "sleepers returning when we map their company" },
  { name: "Extra reviews per recruit", value: "~4×", threshold: "reviews beyond the one we asked for", detail: "one signup left six reviews" },
];

const TODAY_FACTS = ["you cannot know what you will earn", "$100 minimum before anything pays out"];
const BOUNTY_FACTS = ["paid when you finish, by a stated date", "no minimum on this first payout"];

export default async function LoopPage() {
  const supa = db();
  const { data: mappedVendors } = await supa
    .from("vendors")
    .select("name, domain")
    .not("last_mapped_at", "is", null)
    .order("last_mapped_at", { ascending: false })
    .limit(4);

  // the drafts themselves render per candidate in each vendor's book;
  // here the loop only carries the flow fact: how many written, none sent
  const { count: draftCount } = await supa
    .from("outreach_drafts")
    .select("*", { count: "exact", head: true });
  const { count: sentCount } = await supa
    .from("outreach_drafts")
    .select("*", { count: "exact", head: true })
    .eq("sent", true);
  const latestVendor = (mappedVendors ?? [])[0];

  return (
    <div className="page-grain min-h-screen">
      <AppHeader variant="paper" />

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <div className="reveal flex flex-wrap items-center gap-3">
          <h1 className="text-page text-ink">Activation loop</h1>
          <span className="pill bg-city-barcelona">always-on</span>
          <span className="text-dense text-subtle">
            four loops · no recruiting spend
          </span>
          <InfoHint>
            The always-on half of Challenge 1. We map every vendor, but we only
            spend where a client asked. Reviews arrive through four loops that cost
            nothing to run.
          </InfoHint>
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          {/* R0 offer */}
          <section className="reveal reveal-d1 self-start rounded-xl border border-violet-100 bg-violet-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-title text-ink">The offer</h2>
              <span className="pill bg-city-newyork">one scoped change</span>
              <InfoHint align="right">
                Arbolus&rsquo;s own terms already allow variable pricing, so this
                needs no new clause. It ships as one arm of a two-week A/B test and
                the data decides it. The bounty is priced by scarcity: a vendor we
                already cover well pays $0.
              </InfoHint>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div
                className="pane p-4"
                style={{ background: "var(--color-ground-tint)" }}
              >
                <div className="eyebrow">today · every review</div>
                <div className="metric mt-1.5 text-page text-ink-60">
                  $1–5
                  <span className="text-control font-normal text-subtle"> / view</span>
                </div>
                <ul className="mt-2.5 space-y-1 text-caption text-subtle">
                  {TODAY_FACTS.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-ink-35" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pane border-violet-200 p-4 shadow-[var(--shadow-glow-violet)]">
                <div className="eyebrow">first review · companies with no coverage</div>
                <div className="metric mt-1.5 text-page text-violet-link">
                  $25–50
                  <span className="text-control font-normal text-subtle"> flat</span>
                </div>
                <ul className="mt-2.5 space-y-1 text-caption text-subtle">
                  {BOUNTY_FACTS.map((f) => (
                    <li key={f} className="flex items-center gap-1.5">
                      <span className="h-1 w-1 shrink-0 rounded-full bg-violet-400" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 border-t border-violet-200/60 pt-3 text-dense text-subtle-deep">
              The whole change: the first review on an uncovered company pays
              flat instead of per-view — their terms allow it, a two-week A/B
              decides it.
            </p>
          </section>

          {/* compounding metrics */}
          <section className="reveal reveal-d2">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="text-title text-ink">Proof it compounds</h2>
              <span className="pill bg-city-sanjose">simulated</span>
              <InfoHint>
                The invites are drafted and never sent, and the expert list behind
                these numbers is made up. So these values show the instrument
                working, not results. Each tile states the number it has to beat.
              </InfoHint>
            </div>
            <MetricTiles metrics={METRICS} />
          </section>
        </div>

        <div className="reveal reveal-d4 mt-8 grid gap-8 lg:grid-cols-[1.3fr_1fr]">
          {/* 5-step unlock flow */}
          <section>
            <h2 className="mb-3 text-title text-ink">The activation flow</h2>
            <div className="flex flex-col">
              {UNLOCK_STEPS.map((s, i) => (
                <div key={s.n} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-micro text-violet-link">
                      {s.n}
                    </span>
                    {i < UNLOCK_STEPS.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className={`pt-0.5 ${i < UNLOCK_STEPS.length - 1 ? "pb-6" : ""}`}>
                    <span className="text-control text-ink">{s.label}</span>
                    {s.note && (
                      <span className="ml-1.5 inline-flex align-middle">
                        <InfoHint>{s.note}</InfoHint>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* the invites — vertical card beside the flow */}
          <section className="self-start">
            <h2 className="mb-3 text-title text-ink">The invites</h2>
            <div className="pane p-5">
              <div className="flex items-start gap-x-8">
                <div>
                  <span className="eyebrow">written</span>
                  <span className="metric mt-1 block text-display text-ink">
                    {draftCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="eyebrow">sent</span>
                  <span className="metric mt-1 block text-display text-success-text">
                    {sentCount ?? 0}
                  </span>
                </div>
                <span className="ml-auto">
                  <InfoHint align="right">
                    One draft per eligible candidate at the end of every map run —
                    anchored to their evidence, opt-out included, never sent by
                    this prototype. Each link resolves to that vendor&rsquo;s own
                    sign-up page: a destination, not a magnet — people arrive
                    from invites, never from ads or search.
                  </InfoHint>
                </span>
              </div>
              <div className="mt-4 border-t border-line pt-3">
                <span className="eyebrow">land on</span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(mappedVendors ?? []).map((v) => (
                    <Link
                      key={v.domain}
                      href={`/join/${v.domain}`}
                      className="pill bg-violet-50 !text-violet-link no-underline transition-colors hover:bg-violet-100 active:translate-y-px"
                    >
                      /join/{v.domain}
                    </Link>
                  ))}
                </div>
              </div>
              {latestVendor && (
                <p className="mt-4 border-t border-line pt-3 text-dense">
                  <Link href={`/book/${latestVendor.domain}`}>
                    read them in the {vendorName(latestVendor.name)} book →
                  </Link>
                </p>
              )}
            </div>
          </section>
        </div>

        {/* the closing verdict — same table device as burst's by-hand-vs-engine */}
        <section className="reveal reveal-d4 mt-8">
          <h2 className="mb-3 text-title text-ink">Same loops, new aim</h2>
          <div className="pane overflow-hidden">
            <div className="tracker-scroll overflow-x-auto">
              <table className="w-full border-collapse text-control">
                <thead>
                  <tr className="border-b border-line text-left">
                    <th className="w-[190px] px-3.5 py-3" />
                    <th className="border-r border-line/70 px-3.5 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">Today</span>
                        <span className="pill bg-city-sanjose">live in Arbolus</span>
                      </span>
                    </th>
                    <th className="bg-violet-50/60 px-3.5 py-3">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-ink">With the index</span>
                        <span className="pill bg-city-newyork">the proposal</span>
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      [
                        "where reviews land",
                        "the head — tools 2,000+ reviews deep",
                        "companies at 0 that a client just opened",
                      ],
                      [
                        "first review, empty company",
                        "$0 — no views, no pay",
                        "$25–50 flat, known up front",
                      ],
                      [
                        "the $10 colleague invite",
                        "fires at anyone",
                        "fires where the index maps a gap",
                      ],
                      [
                        "the extra reviews people leave",
                        "one signup left 6 — all on the head",
                        "the same spillover, seeded at the gaps",
                      ],
                      [
                        "which companies",
                        "wherever reviews happen to land",
                        "free loops: all 20,000 · paid bounties: only where clients asked",
                      ],
                      [
                        "what Arbolus must build",
                        "—",
                        "0 systems · 1 price parameter",
                      ],
                    ] as [string, string, string][]
                  ).map(([k, today, indexed]) => (
                    <tr key={k} className="border-b border-line last:border-0">
                      <td className="w-[190px] whitespace-nowrap px-3.5 py-3 font-mono text-caption uppercase tracking-[0.06em] text-subtle">
                        {k}
                      </td>
                      <td className="metric border-r border-line/70 px-3.5 py-3 text-dense text-ink-60">
                        {today}
                      </td>
                      <td className="metric bg-violet-50/60 px-3.5 py-3 text-dense text-ink">
                        {indexed}
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
              The whole discipline in one line: index everything for pennies ·
              pay only where a client asked · run the free loops everywhere,
              because free needs no gate.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
