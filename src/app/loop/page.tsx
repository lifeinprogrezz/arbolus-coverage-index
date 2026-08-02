import Link from "next/link";
import { db } from "@/lib/db";
import { redactQuote } from "@/lib/mask";
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

// Presentation only: pull the trailing compliance/opt-out line out of a draft
// body so it renders visually distinct. No match → body renders unchanged.
function splitCompliance(body: string): { main: string; compliance: string | null } {
  const lines = body.split("\n");
  let i = lines.length - 1;
  while (i >= 0 && lines[i].trim() === "") i--;
  if (i >= 0 && /opt[ -]?out|unsubscribe|no further (contact|email)|remove you|found your details|public(ly)? (available|listed)/i.test(lines[i])) {
    return {
      main: lines.slice(0, i).join("\n").trimEnd(),
      compliance: lines.slice(i).join("\n").trim(),
    };
  }
  return { main: body, compliance: null };
}

export default async function LoopPage() {
  const supa = db();
  const { data: mappedVendors } = await supa
    .from("vendors")
    .select("name, domain")
    .not("last_mapped_at", "is", null)
    .order("last_mapped_at", { ascending: false })
    .limit(4);

  // drafts render NAME-REDACTED — same masking contract as the book
  const { data: rawDrafts } = await supa
    .from("outreach_drafts")
    .select("channel, subject, body, drafted_at, sent, candidates(full_name)")
    .order("drafted_at", { ascending: false })
    .limit(6);
  // which vendor a draft is about, derived from its own text — no extra query
  const knownVendors = (mappedVendors ?? []).map((v) => v.name).filter(Boolean);
  const vendorInText = (text: string): string | null => {
    const hay = text.toLowerCase();
    return knownVendors.find((n) => hay.includes(n.toLowerCase())) ?? null;
  };

  const drafts = (rawDrafts ?? []).map((d) => {
    const name = (d.candidates as { full_name?: string } | null)?.full_name ?? null;
    return {
      channel: d.channel,
      sent: d.sent,
      subject: redactQuote(d.subject, name),
      body: redactQuote(d.body, name),
      vendor: vendorInText(`${d.subject ?? ""} ${d.body ?? ""}`),
    };
  });

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

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {/* R0 offer */}
          <section className="reveal reveal-d1 self-start rounded-xl border border-violet-100 bg-violet-50 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-title text-ink">The offer</h2>
              <span className="pill bg-city-newyork">R0</span>
              <span className="text-dense text-subtle">one change</span>
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

          {/* drafted invites */}
          <section>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <h2 className="text-title text-ink">Invite queue</h2>
              {drafts.length > 0 && (
                <span className="metric text-dense text-subtle">({drafts.length})</span>
              )}
              <span className="pill bg-city-sanjose">drafts only · names hidden</span>
              <InfoHint>
                The engine writes drafts. It never sends them, and it never writes a
                word of anyone&rsquo;s review. Every draft carries the public evidence
                it is based on, an opt-out line, and a{" "}
                <span className="metric">sent: never</span> flag this prototype never
                flips. Names are hidden here under the same rule as the book.
              </InfoHint>
            </div>
            {drafts.length === 0 ? (
              <div className="pane p-5 text-dense text-subtle">
                No drafts yet. After a map run, the drafts written from the evidence
                appear here.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {drafts.map((d, i) => {
                  const { main, compliance } = splitCompliance(d.body ?? "");
                  return (
                    <details key={i} className="group pane overflow-hidden">
                      <summary className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-ink/[.03] [&::-webkit-details-marker]:hidden">
                        <span className="metric shrink-0 text-caption text-ink-35">
                          #{i + 1}
                        </span>
                        <svg
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          className="shrink-0 text-subtle transition-transform duration-200 group-open:rotate-90"
                          aria-hidden
                        >
                          <path
                            d="M3 1.5 7.5 5 3 8.5"
                            stroke="currentColor"
                            strokeWidth="1.4"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <span className="pill shrink-0 bg-city-sanjose">{d.channel}</span>
                        {d.vendor && (
                          <span className="shrink-0 whitespace-nowrap text-dense font-medium text-violet-link">
                            {vendorName(d.vendor)}
                          </span>
                        )}
                        <span className="truncate text-control text-ink">{d.subject}</span>
                        <span className="metric ml-auto shrink-0 rounded-md bg-ground-tint px-1.5 py-0.5 text-micro text-subtle">
                          sent: {d.sent ? "yes" : "never"}
                        </span>
                      </summary>
                      <div className="border-t border-line px-4 py-3">
                        <p className="whitespace-pre-wrap text-dense leading-relaxed text-ink-60">
                          {main}
                        </p>
                        {compliance && (
                          <p className="provenance mt-3 whitespace-pre-wrap border-t border-dashed border-line pt-2.5">
                            {compliance}
                          </p>
                        )}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
