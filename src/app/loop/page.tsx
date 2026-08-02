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
  { name: "Invites per contributor", value: "1.18", threshold: "above 1 = it compounds", detail: "new contributors each contributor brings in, invites only" },
  { name: "Answered from our own experts", value: "31%", threshold: "should rise every run", detail: "share of a gap we can fill internally before any cold outreach" },
  { name: "Quiet experts brought back", value: "9%", threshold: "anything above 0 is free", detail: "dormant experts re-prompted when the index first maps their company" },
  { name: "Extra reviews per recruit", value: "~4×", threshold: "reviews beyond the one we asked for", detail: "first-hand, one person: a single signup left six reviews" },
];

const TODAY_FACTS = ["you cannot know what you will earn", "$100 before anything pays out", "only pays if clients read you"];
const BOUNTY_FACTS = ["amount named up front", "paid when you finish, by a stated date", "no minimum on this first payout"];

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

        {/* the C1 thesis as a contrast pair — same machines, new aim */}
        <div className="reveal mt-5 grid max-w-3xl gap-3 sm:grid-cols-2">
          <div
            className="pane p-4"
            style={{ background: "var(--color-ground-tint)" }}
          >
            <span className="eyebrow">today · already live in Arbolus</span>
            <p className="mt-1.5 text-dense leading-relaxed text-subtle-deep">
              The same loops fire at the head: a popular tool earns views
              forever, an empty company earns $0 — nobody rational reviews it.
            </p>
          </div>
          <div className="pane border-violet-200 p-4 shadow-[var(--shadow-glow-violet)]">
            <span className="eyebrow text-violet-link">with the index</span>
            <p className="mt-1.5 text-dense leading-relaxed text-subtle-deep">
              Every loop re-aimed at the companies clients open and find empty —
              and one price change makes the first review there worth writing.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
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

        {/* per-vendor conversion pages — one line */}
        <section className="reveal reveal-d3 mt-8">
          <div className="pane flex flex-wrap items-center gap-x-3 gap-y-2 p-4">
            <span className="eyebrow">where invites land</span>
            <InfoHint>
              Every invite&rsquo;s link resolves to that vendor&rsquo;s own sign-up
              page. It is a destination, not a magnet: people arrive from the invites
              we send, and the page itself never runs ads or chases search traffic.
            </InfoHint>
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
        </section>

        <div className="reveal reveal-d4 mt-10 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          {/* 5-step unlock flow */}
          <section>
            <h2 className="mb-4 text-title text-ink">The activation flow</h2>
            <div className="flex flex-col">
              {UNLOCK_STEPS.map((s, i) => (
                <div key={s.n} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-50 text-micro text-violet-link">
                      {s.n}
                    </span>
                    {i < UNLOCK_STEPS.length - 1 && <span className="w-px flex-1 bg-line" />}
                  </div>
                  <div className={`pt-0.5 ${i < UNLOCK_STEPS.length - 1 ? "pb-4" : ""}`}>
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

          {/* the composer's output, as a flow fact — the drafts themselves
              live on each candidate's row in the vendor's book */}
          <section className="self-start">
            <h2 className="mb-4 text-title text-ink">What the composer wrote</h2>
            <div className="pane p-5">
              <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                <div>
                  <span className="eyebrow">invites written</span>
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
                <p className="max-w-[230px] self-center text-dense text-subtle-deep">
                  One per eligible candidate at the end of every map run —
                  anchored to their evidence, opt-out included, never sent.
                </p>
              </div>
              {latestVendor && (
                <p className="mt-4 border-t border-line pt-3 text-dense text-subtle-deep">
                  Read them on each candidate&rsquo;s row in{" "}
                  <Link href={`/book/${latestVendor.domain}`}>
                    the {vendorName(latestVendor.name)} book →
                  </Link>
                </p>
              )}
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
