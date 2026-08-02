import Link from "next/link";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";

// Reference — the data dictionary. Every surface, every column: what it
// means, where the number comes from, and the formula when there is one.
// The page defines the UI with the UI: real pills, real lane dots, the
// contact ladder drawn like the run rail. Linked from the site footer.

export const metadata = {
  title: "Reference — Coverage Index",
};

const SECTIONS = [
  { id: "board", n: "01", title: "The coverage board" },
  { id: "queue", n: "02", title: "The map queue" },
  { id: "lanes", n: "03", title: "The engine lanes" },
  { id: "learning", n: "04", title: "The learning loop" },
  { id: "book", n: "05", title: "A vendor's book" },
  { id: "burst", n: "06", title: "The burst clock" },
  { id: "loop", n: "07", title: "The activation loop" },
  { id: "honesty", n: "08", title: "The honesty rules" },
];

function Section({
  id,
  n,
  title,
  lead,
  children,
}: {
  id: string;
  n: string;
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 pt-12 first:pt-0">
      <div className="flex items-baseline gap-3">
        <span className="metric text-dense text-violet-link">{n}</span>
        <h2 className="eyebrow">{title}</h2>
      </div>
      <p className="mt-2 max-w-2xl text-control text-subtle-deep">{lead}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Term({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line py-3 last:border-0 sm:grid sm:grid-cols-[190px_1fr] sm:gap-5">
      <span className="font-mono text-caption uppercase tracking-[0.06em] text-subtle">
        {k}
      </span>
      <span className="mt-1 block text-control leading-relaxed text-ink-60 sm:mt-0">
        {children}
      </span>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-violet-100 bg-white px-4 py-3 shadow-[var(--shadow-glow-violet)]">
      <span className="mb-1 block font-mono text-caption uppercase tracking-[0.08em] text-violet-link">
        formula
      </span>
      <code className="metric block whitespace-pre-wrap text-dense leading-relaxed text-ink">
        {children}
      </code>
    </div>
  );
}

function Dot({ tone }: { tone: "live" | "nightly" | "dark" }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
        tone === "live"
          ? "bg-success"
          : tone === "nightly"
            ? "bg-violet-400"
            : "border border-ink-35 bg-transparent"
      }`}
    />
  );
}

const LANES: {
  n: string;
  name: string;
  reads: string;
  tone: "live" | "nightly";
  tag?: string;
}[] = [
  { n: "01", name: "sitemap harvest", reads: "The vendor's own sitemap — which case-study and customer pages to read next. Free.", tone: "live" },
  { n: "02", name: "customer pages", reads: "Case studies and customer walls, read for named organizations and people.", tone: "live" },
  { n: "03", name: "wayback churn diff", reads: "Old snapshots of those pages from the Wayback Machine. Free history.", tone: "live" },
  { n: "03b", name: "logo-wall diff", reads: "Logos that appeared on the customer wall and later vanished — churned-customer candidates, with dates. Candidates, not fact: redesigns cause false churn.", tone: "live" },
  { n: "04", name: "ats job-post sweep", reads: "Public job posts naming the vendor in a company's stack. Anglo boards today; local boards (Japan, Brazil, India) are production extensions — the lane is geo-locked where they aren't wired, and says so.", tone: "live" },
  { n: "05", name: "peerspot reviews", reads: "Public reviews: named reviewers with roles and dates.", tone: "live" },
  { n: "06", name: "serp long-tail", reads: "Web search for mentions the structured lanes miss. Dark without its API key.", tone: "live" },
  { n: "07", name: "community", reads: "Public Discourse forums — people describing what they run. Slow, polite crawling.", tone: "nightly", tag: "nightly" },
  { n: "08", name: "procurement", reads: "TED, the EU's public procurement journal. A contract award is the hardest evidence there is: the organization provably pays. EU-only register; national registers are the production extension elsewhere.", tone: "nightly", tag: "nightly" },
  { n: "09", name: "github", reads: "Public code referencing the vendor's SDK corroborates candidates other lanes found. Never used to harvest people.", tone: "nightly", tag: "verify-only" },
  { n: "10", name: "classify · write", reads: "The only AI step: Claude Haiku reads what the lanes fetched and writes structured rows. Everything before it is deterministic fetching.", tone: "live" },
];

const CHECKS = [
  "vendor's own staff",
  "subsidiaries and parents",
  "vendor GitHub org members",
  "forum admins and moderators",
  "vendor email domains",
  "speakers at vendor events",
  "competitor employees",
  "intermediaries — investors, consultancies, analysts",
];

export default function ReferencePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="relative z-[1] mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {/* hero */}
        <section className="reveal">
          <p className="eyebrow">Reference</p>
          <h1 className="mt-3 max-w-2xl text-display tracking-[-0.01em] text-ink">
            Every number, explained.
          </h1>
          <p className="mt-3 max-w-2xl text-control text-subtle-deep">
            What each column means, where the value comes from, and the formula
            when there is one. Everything here describes what actually runs —
            anything simulated says so where you see it.
          </p>
        </section>

        <div className="reveal reveal-d1 mt-10 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-12">
          {/* section rail */}
          <nav
            aria-label="Sections"
            className="mb-8 flex flex-wrap gap-x-4 gap-y-2 lg:sticky lg:top-24 lg:mb-0 lg:block lg:self-start"
          >
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="group flex items-baseline gap-2 whitespace-nowrap py-1 text-dense !text-subtle no-underline hover:!text-ink lg:py-1.5"
              >
                <span className="metric text-caption text-ink-35 transition-colors group-hover:text-violet-link">
                  {s.n}
                </span>
                {s.title}
              </a>
            ))}
          </nav>

          <div className="min-w-0">
            <Section
              id="board"
              n="01"
              title="The coverage board"
              lead="One row per vendor we index — a company a client might diligence. The row answers: how warm is our book for it, and what did knowing that cost."
            >
              {/* book states — the real pills */}
              <div className="pane mb-4 p-4">
                <span className="mb-3 block font-mono text-caption uppercase tracking-[0.08em] text-subtle">
                  the four book states
                </span>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                  <span className="flex items-center gap-2">
                    <span className="pill bg-city-london">covered</span>
                    <span className="metric text-dense text-subtle-deep">20+ reviews</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="pill bg-city-london">warm book</span>
                    <span className="metric text-dense text-subtle-deep">depth ≥ 8</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="pill bg-city-newdelhi">thin book</span>
                    <span className="metric text-dense text-subtle-deep">depth 3–7</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="pill bg-city-sanjose">cold</span>
                    <span className="metric text-dense text-subtle-deep">depth &lt; 3</span>
                  </span>
                </div>
                <p className="mt-3 text-dense text-subtle-deep">
                  depth = people we can name + experts already in network.
                </p>
              </div>

              <div className="pane px-5 py-2">
                <Term k="people">
                  Named individuals with first-hand evidence of using the vendor,
                  surviving all eight eligibility checks (<a href="#book">§05</a>).
                </Term>
                <Term k="companies">
                  Organizations with evidence they use the vendor — outreach
                  targets even before a person is named.
                </Term>
                <Term k="in network">
                  Experts already in the Arbolus network at one of those companies.
                  Verified and paid before: they cost nothing to acquire. Demo base
                  is synthetic; the matching is real.
                </Term>
                <Term k="excluded">
                  People found and ruled out, with the reason kept. Counting the
                  rejects is deliberate — ruling out is work the engine shows.
                </Term>
                <Term k="cost">
                  Everything spent crawling this vendor: page fetches (Jina Reader,
                  $0.02 per million tokens) plus the AI reading step (Claude
                  Haiku). Free lanes contribute $0.000.
                </Term>
                <Term k="mapped">When the engine last crawled this vendor.</Term>
                <Term k="request coverage">
                  Records one simulated demand event — a client searched and found
                  nothing. Events accumulate: the queue measures how much demand,
                  not whether there is any.
                </Term>
                <Term k="book →">Opens the vendor&rsquo;s book. Read-only.</Term>
              </div>
            </Section>

            <Section
              id="queue"
              n="02"
              title="The map queue"
              lead="Which vendor gets indexed next, ranked by what clients actually asked for. The weights are written down, not learned."
            >
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="pill bg-city-barcelona">
                  searched &amp; empty&ensp;<span className="metric">×3</span>
                </span>
                <span className="pill bg-city-newyork">
                  funding round&ensp;<span className="metric">×2</span>
                </span>
                <span className="pill bg-city-newyork">
                  client opened it&ensp;<span className="metric">×2</span>
                </span>
                <span className="pill bg-city-sanjose">
                  watchlist&ensp;<span className="metric">×1</span>
                </span>
                <span className="pill bg-city-sanjose">
                  competitor of indexed&ensp;<span className="metric">+1</span>
                </span>
              </div>
              <Formula>
                score = Σ event weights&ensp;·&ensp;already mapped with a warm book
                → score × 0.5
              </Formula>
              <div className="pane mt-4 px-5 py-2">
                <Term k="score">
                  The weighted sum. Pills on a queue row are deduplicated signal
                  types — one pill can stand for several events, so fewer pills can
                  outrank more.
                </Term>
                <Term k="map now">
                  The action button on a never-crawled row — one click lands on
                  Map run pre-filled with this vendor, for its first map.
                </Term>
                <Term k="re-map">
                  The button on a row that has a book already but demand keeps
                  arriving — same pre-filled landing, for a refresh crawl.
                </Term>
                <Term k="dispatch">
                  In production the engine works this queue itself: crossing the
                  demand threshold is what authorises the crawl and its budget — no
                  demand, no spend. Indexed books refresh by heat: hot weekly, warm
                  monthly, cold quarterly. In this prototype runs are fired by hand
                  from <Link href="/run">Map run</Link>.
                </Term>
              </div>
            </Section>

            <Section
              id="lanes"
              n="03"
              title="The engine lanes"
              lead="Eleven sources of public evidence. Live lanes fire inside every map run; nightly lanes do their rounds once a night from a local worker and journal into the same books."
            >
              <div className="pane px-5 py-2">
                {LANES.map((l) => (
                  <div
                    key={l.n}
                    className="border-b border-line py-3 last:border-0 sm:grid sm:grid-cols-[190px_1fr] sm:gap-5"
                  >
                    <span className="flex items-center gap-2 whitespace-nowrap">
                      <span className="metric text-caption text-ink-35">{l.n}</span>
                      <Dot tone={l.tone} />
                      <span className="font-mono text-caption uppercase tracking-[0.06em] text-subtle">
                        {l.name}
                      </span>
                      {l.tag && (
                        <span className="text-caption text-ink-60">· {l.tag}</span>
                      )}
                    </span>
                    <span className="mt-1 block text-control leading-relaxed text-ink-60 sm:mt-0">
                      {l.reads}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-dense text-subtle-deep">
                <span className="flex items-center gap-1.5">
                  <Dot tone="live" /> live in every run
                </span>
                <span className="flex items-center gap-1.5">
                  <Dot tone="nightly" /> nightly, on its own schedule
                </span>
                <span className="flex items-center gap-1.5">
                  <Dot tone="dark" /> dark — switched off without its key
                </span>
              </p>
            </Section>

            <Section
              id="learning"
              n="04"
              title="The learning loop"
              lead="The engine grades its own lanes on real results and reallocates the next run's budget. Real signals from real runs — no invented curves."
            >
              <Formula>
                lane score = rows per run ÷ (1 + 10 × cost per run) + 0.1
                {"\n"}next-run share = lane score ÷ Σ all lane scores
              </Formula>
              <div className="pane mt-4 px-5 py-2">
                <Term k="rows / $">
                  Evidence rows per dollar across all real runs. FREE marks
                  zero-cost lanes — they rank on rows alone.
                </Term>
                <Term k="next run">
                  The budget share the lane has earned. Lanes that return nothing
                  get defunded to the small exploration share — the +0.1 keeps
                  every lane occasionally retried, so a defunded lane can earn its
                  way back.
                </Term>
              </div>
            </Section>

            <Section
              id="book"
              n="05"
              title="A vendor's book"
              lead="The output: who we can name, why we believe it, and how warm the path is. Evidence gets you in, confidence ranks you, in-network decides which door we knock on first."
            >
              {/* contact ladder — drawn like the run rail */}
              <div className="pane mb-4 p-4">
                <span className="mb-3 block font-mono text-caption uppercase tracking-[0.08em] text-subtle">
                  the contact ladder
                </span>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                  <span className="font-mono text-caption uppercase tracking-[0.08em] text-ink">
                    unresolved
                  </span>
                  <span aria-hidden className="h-px w-6 bg-line" />
                  <span className="font-mono text-caption uppercase tracking-[0.08em] text-violet-link">
                    resolved
                  </span>
                  <span aria-hidden className="h-px w-6 bg-line" />
                  <span className="font-mono text-caption uppercase tracking-[0.08em] text-success-text">
                    verified
                  </span>
                  <span aria-hidden className="h-px w-6 bg-line" />
                  <span className="font-mono text-caption uppercase tracking-[0.08em] text-ink-35">
                    bounced
                  </span>
                </div>
                <p className="mt-3 text-dense text-subtle-deep">
                  we know who → address found → address confirmed → tried and
                  failed. Fresh map runs produce people at{" "}
                  <span className="metric">unresolved</span> by definition: the
                  crawl proves identity and evidence, not reachability.
                </p>
              </div>

              <div className="pane px-5 py-2">
                <Term k="identity">
                  Real names, masked at the server before anything reaches the
                  browser. One unmask toggle exists for a private walkthrough.
                </Term>
                <Term k="signal">
                  What the evidence says this person did: ran it, chose it, admin,
                  wrote about it.
                </Term>
                <Term k="confidence">
                  The strength of the person&rsquo;s best receipt. Evidence type
                  sets the base; age decays it — evidence older than about two
                  years demotes the read from current user toward past user.
                </Term>
                <Term k="evidence">
                  The receipts: source, date, type, and a name-redacted quote per
                  entry. Nobody enters the book without at least one. Full URL and
                  name live behind the unmask toggle only.
                </Term>
                <Term k="in network">
                  This person — or a colleague at the same company — is already an
                  Arbolus expert. The warmest path in the system.
                </Term>
                <Term k="contact">
                  A guessed address from name + employer domain, the cheapest way
                  to reach someone. Verifying it is a production step.
                </Term>
                <Term k="reach">
                  The channels the data proves for this specific person, shown
                  warmest first — the try-order: <em>warm intro</em> (network
                  match: zero cost, best reply rate) → <em>community</em> (forum
                  evidence exists) → <em>direct email</em> (address guess exists,
                  colored by the vendor&rsquo;s legal rules). Nothing appears that
                  isn&rsquo;t derived from real data, and which channel actually
                  converts is one of the numbers the two-week experiment measures.
                </Term>
                <Term k="invite draft">
                  The email the composer wrote for this person at the end of the
                  map run, anchored to their own evidence, bounty priced by book
                  depth. Drafted, never sent — sending is the production switch,
                  after the per-person legal check.
                </Term>
                <Term k="the contact panel">
                  Every route to a person, grouped by warmth: <em>internal</em>{" "}
                  (warm intro via our network · re-engaging our own experts —
                  existing consented relationships, open everywhere) ·{" "}
                  <em>peer</em> (colleague invites — the invite comes from a
                  colleague and the invitee contacts us) · <em>external</em>{" "}
                  (direct email · through communities · letters in the post ·
                  cold calls), each row carrying its legal state: open · consent
                  first · legal check · closed.
                </Term>
              </div>

              <div className="pane mt-4 p-4">
                <span className="mb-3 block font-mono text-caption uppercase tracking-[0.08em] text-subtle">
                  the eight eligibility checks — ruled out, reason kept
                </span>
                <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
                  {CHECKS.map((c) => (
                    <span key={c} className="flex items-baseline gap-2 text-control text-ink-60">
                      <span aria-hidden className="metric text-caption text-ink-35">
                        ✕
                      </span>
                      {c}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-dense text-subtle-deep">
                  The last one is the core rule: first-hand operators only — the
                  people who ran it, chose it, or lived with it.
                </p>
              </div>
            </Section>

            <Section
              id="burst"
              n="06"
              title="The burst clock"
              lead="Challenge 2: a client opens an empty company — what 30 days looks like from there."
            >
              <div className="pane px-5 py-2">
                <Term k="the clock">
                  Day by day: warm book first, then invites, conversion,
                  verification. On stated assumptions the base case reaches 8–18
                  verified contributors in 30 days; a priced escalation closes to
                  20.
                </Term>
                <Term k="the walk">
                  The general base case, any vendor: five recruiting routes, each
                  tagged with its origin — the same internal / peer / external
                  taxonomy as the book&rsquo;s contact panel.
                </Term>
                <Term k="sliders">
                  Every invented rate is labelled as an assumption and rendered as
                  a slider, running on the selected vendor&rsquo;s real counts.
                  The numbers recompute from your positions — nothing is
                  hard-coded to look good.
                </Term>
                <Term k="spend on these settings">
                  The sliders price themselves live: the cost table&rsquo;s own
                  lines at the current assumptions, with cost per verified
                  underneath. All figures USD.
                </Term>
                <Term k="bounty tiers">
                  Scarcity pricing, set by book depth at compose time:{" "}
                  <span className="metric">$25</span> when 8+ people are named ·{" "}
                  <span className="metric">$50</span> at 3–7 ·{" "}
                  <span className="metric">$75</span> below 3. The thinner the
                  book, the harder the find, the higher the first-review bounty.
                </Term>
                <Term k="budget">
                  Released by demand: the searched-and-found-nothing events on the
                  board are what authorise burst spend for that vendor.
                </Term>
              </div>
            </Section>

            <Section
              id="loop"
              n="07"
              title="The activation loop"
              lead="Challenge 1's compounding, built not prose: four always-on loops that spend no recruiting money."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    k: "invites per contributor",
                    t: "above 1 = it compounds",
                    d: "New contributors each contributor brings in. Above one, the loop grows on its own.",
                  },
                  {
                    k: "answered from our own experts",
                    t: "should rise every run",
                    d: "The share of a coverage gap filled from the network before any cold outreach.",
                  },
                  {
                    k: "quiet experts brought back",
                    t: "anything above 0 is free",
                    d: "Dormant experts re-prompted when the index first maps their company.",
                  },
                  {
                    k: "extra reviews per recruit",
                    t: "ask one, get more",
                    d: "First-hand: one signup left six reviews.",
                  },
                ].map((m) => (
                  <div key={m.k} className="pane p-4">
                    <span className="block font-mono text-caption uppercase tracking-[0.08em] text-subtle">
                      {m.k}
                    </span>
                    <span className="metric mt-1 block text-dense text-success-text">
                      {m.t}
                    </span>
                    <p className="mt-1.5 text-dense leading-relaxed text-ink-60">{m.d}</p>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              id="honesty"
              n="08"
              title="The honesty rules"
              lead="The register the whole prototype runs on."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  {
                    k: "live vs simulated",
                    d: "Everything that runs, runs on real public data. Everything simulated — demand events, review counts, the expert base — is labelled where you see it.",
                  },
                  {
                    k: "zeros are zeros",
                    d: "A lane that found nothing journals a zero. No invented evidence, ever.",
                  },
                  {
                    k: "masking",
                    d: "Candidate identities are masked at the API layer — the browser never receives real names unless the single unmask toggle is used.",
                  },
                  {
                    k: "costs on the ticker",
                    d: "Every run shows its own price, so no cost claim has to be taken on faith.",
                  },
                ].map((m) => (
                  <div key={m.k} className="pane p-4">
                    <span className="block font-mono text-caption uppercase tracking-[0.08em] text-violet-link">
                      {m.k}
                    </span>
                    <p className="mt-1.5 text-dense leading-relaxed text-ink-60">{m.d}</p>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
