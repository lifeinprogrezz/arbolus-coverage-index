import Link from "next/link";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";

// Reference — the data dictionary. Every surface, every column: what it
// means, where the number comes from, and the formula when there is one.
// Linked from the site footer. Same paper system as everything else.

export const metadata = {
  title: "Reference — Coverage Index",
};

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <>
      <span className="dg-k">{k}</span>
      <span className="dg-v">{children}</span>
    </>
  );
}

function Section({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="eyebrow mb-1">{title}</h2>
      {lead && <p className="mb-3 max-w-3xl text-dense text-subtle-deep">{lead}</p>}
      <div className="pane p-5">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <code className="metric block whitespace-pre-wrap rounded-md bg-ink/[.04] px-3 py-2 text-dense">
      {children}
    </code>
  );
}

export default function ReferencePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />

      <main className="relative z-[1] mx-auto w-full max-w-4xl flex-1 px-6 py-8">
        <section className="reveal">
          <p className="eyebrow">Reference</p>
          <h1 className="mt-3 max-w-2xl text-display text-ink">
            Every number on every surface, explained.
          </h1>
          <p className="mt-3 max-w-3xl text-control text-subtle-deep">
            What each column means, where the value comes from, and the formula
            when there is one. Everything here describes what actually runs in
            this prototype — anything simulated says so.
          </p>
        </section>

        <div className="reveal reveal-d1">
          <Section
            title="The coverage board"
            lead="One row per vendor we index. A vendor is a B2B software company a client might diligence; the row is how warm our book is for it."
          >
            <div className="dg">
              <Row k="Book">
                The state pill, from real counts: <em>covered</em> when the vendor
                already has 20+ reviews · <em>warm book</em> when people + in-network
                matches reach 8 · <em>thin book</em> at 3–7 · <em>cold</em> below 3.
              </Row>
              <Row k="People">
                Named individuals with first-hand evidence of using the vendor,
                found by the lanes and passing all eight eligibility checks.
              </Row>
              <Row k="Companies">
                Organizations with evidence they use the vendor. These are the
                targets for room-level outreach even when no person is named yet.
              </Row>
              <Row k="In network">
                Experts already in the Arbolus network who work at one of those
                companies (or a colleague does). Verified and paid before, so they
                cost nothing to acquire. Demo base is synthetic; the matching is real.
              </Row>
              <Row k="Excluded">
                People found and then ruled out, with the reason kept. Counting the
                rejects is deliberate: ruling out is work the engine shows.
              </Row>
              <Row k="Cost">
                Total spent crawling this vendor: page fetches (Jina Reader,
                $0.02 per million tokens) plus the AI reading step (Claude Haiku,
                priced per token). Free lanes contribute $0.000.
              </Row>
              <Row k="Mapped">When the engine last crawled this vendor.</Row>
              <Row k="request coverage">
                Records one simulated demand event: a client searched and found
                nothing. Events accumulate — the queue measures how much demand,
                not whether there is any.
              </Row>
              <Row k="book →">Opens the vendor&rsquo;s book. Read-only.</Row>
            </div>
          </Section>

          <Section
            title="The map queue"
            lead="Which vendor gets indexed next, ranked by what clients actually asked for. Signal weights are a documented heuristic, not learned."
          >
            <Formula>
              score = 3 × searched-and-empty + 2 × funding round + 2 × client view
              + 1 × watchlist entry (+1 if competitor of an indexed vendor)
              {"\n"}already mapped with a warm book (8+) → score × 0.5
            </Formula>
            <div className="dg mt-4">
              <Row k="Score">
                The weighted sum above. Pills are deduplicated signal types, so one
                pill can stand for several events — fewer pills can outrank more.
              </Row>
              <Row k="not indexed yet">
                Never crawled. Reaching the top of the queue means a first map run.
              </Row>
              <Row k="re-map queued">
                Already has a book, but demand keeps arriving — queued for a refresh
                crawl.
              </Row>
              <Row k="Dispatch">
                In production the engine works this queue itself: crossing the
                demand threshold authorises the crawl and its budget. No demand, no
                spend. Indexed books refresh by heat — hot weekly, warm monthly,
                cold quarterly. In this prototype, runs are fired by hand from{" "}
                <Link href="/run">Map run</Link>.
              </Row>
            </div>
          </Section>

          <Section
            title="The engine lanes"
            lead="Eleven sources of public evidence. Live lanes fire inside every map run; nightly lanes do their rounds once a night from a local worker and journal into the same books."
          >
            <div className="dg">
              <Row k="01 sitemap harvest">
                The vendor&rsquo;s own sitemap — case-study and customer pages to
                read next. Free.
              </Row>
              <Row k="02 customer pages">
                The vendor&rsquo;s case studies and customer walls, read for named
                organizations and people.
              </Row>
              <Row k="03 wayback churn diff">
                Old snapshots of those pages from the Wayback Machine. Free history.
              </Row>
              <Row k="03b logo-wall diff">
                Logos that appeared on the customer wall and later vanished —
                churned-customer candidates, with dates. Flagged as candidates, not
                fact: redesigns and acquisitions cause false churn.
              </Row>
              <Row k="04 ats job-post sweep">
                Public job posts naming the vendor in a company&rsquo;s stack —
                the org uses it, and the hiring team touches it.
              </Row>
              <Row k="05 peerspot reviews">
                Public reviews: named reviewers with roles and dates.
              </Row>
              <Row k="06 serp long-tail">
                Web search for mentions the structured lanes miss. Needs an API
                key; shows as dark when the key is absent.
              </Row>
              <Row k="07 community (nightly)">
                Public Discourse forums — people describing what they run. Needs
                slow, polite crawling, so it runs on the night shift.
              </Row>
              <Row k="08 procurement (nightly)">
                TED, the EU&rsquo;s public procurement journal. A contract award
                naming the vendor is the hardest evidence in the engine: an
                organization provably pays for the tool.
              </Row>
              <Row k="09 github (nightly, verify-only)">
                Public code referencing the vendor&rsquo;s SDK proves it is really
                in an organization&rsquo;s stack. Used only to corroborate
                candidates other lanes found — never to harvest people from code.
              </Row>
              <Row k="10 classify · write">
                The only AI step: Claude Haiku reads what the lanes fetched and
                writes structured rows — people, companies, evidence, exclusions.
                Everything before it is deterministic fetching.
              </Row>
            </div>
          </Section>

          <Section
            title="The learning loop"
            lead="The engine grades its own lanes on real results and reallocates the next run's budget. Real signals from real runs — no invented curves."
          >
            <Formula>
              lane score = (evidence rows per run) ÷ (1 + 10 × cost per run) + 0.1
              {"\n"}next-run share = lane score ÷ sum of all lane scores
            </Formula>
            <div className="dg mt-4">
              <Row k="Rows / $">
                Evidence rows per dollar across all real runs. FREE marks
                zero-cost lanes — they rank on rows alone.
              </Row>
              <Row k="Next run">
                The share of the next run&rsquo;s request budget the lane has
                earned. Lanes that return nothing get defunded to the small
                exploration share (the +0.1 keeps every lane occasionally retried).
              </Row>
            </div>
          </Section>

          <Section
            title="A vendor's book"
            lead="The output: who we can name, why we believe it, and how warm the path is. Evidence gets you in, confidence ranks you, in-network decides which door we knock on first."
          >
            <div className="dg">
              <Row k="Identity">
                Real names, masked at the server before anything is sent to the
                browser. One unmask toggle exists for a private walkthrough.
              </Row>
              <Row k="Signal">
                What the evidence says this person did: ran it, chose it, admin,
                wrote about it. Set by the classify step from the quote.
              </Row>
              <Row k="Confidence">
                The strength of the person&rsquo;s best receipt. Evidence type sets
                the base; age decays it — evidence older than about two years
                demotes the read from current user toward past user.
              </Row>
              <Row k="Evidence">
                The receipts: source, date, type, and a name-redacted quote per
                entry. Nobody enters the book without at least one. Full URL and
                name live behind the unmask toggle only.
              </Row>
              <Row k="In network">
                This person, or a colleague at the same company, is already an
                Arbolus expert. The warmest path in the system.
              </Row>
              <Row k="Contact">
                A guessed address from name + employer domain — the cheapest way to
                reach someone. Verifying it is a production step.
              </Row>
              <Row k="Stage">
                The contact ladder: <em>unresolved</em> (we know who, not how to
                reach them) → <em>resolved</em> (address found) → <em>verified</em>{" "}
                (address confirmed) → <em>bounced</em> (tried and failed). Fresh
                map runs produce people at unresolved by definition.
              </Row>
              <Row k="Excluded">
                Ruled out, reason kept. Eight checks: vendor&rsquo;s own staff ·
                subsidiaries and parents · vendor GitHub org members · forum
                moderators · vendor email domains · speakers at vendor events ·
                competitor employees · intermediaries (investors, consultancies,
                analysts). The last one is the core rule: first-hand operators
                only.
              </Row>
            </div>
          </Section>

          <Section
            title="The burst clock"
            lead="Challenge 2: a client opens an empty company — what 30 days looks like from there."
          >
            <div className="dg">
              <Row k="The clock">
                Day-by-day: warm book first, then invites, conversion, verification.
                On stated assumptions the base case reaches 8–18 verified
                contributors in 30 days; a priced escalation path closes to 20.
              </Row>
              <Row k="Sliders">
                Every invented rate is labelled as an assumption and rendered as a
                slider you can move. The numbers recompute from your positions —
                nothing is hard-coded to look good.
              </Row>
              <Row k="Budget">
                Released by demand: the searched-and-found-nothing events on the
                board are what authorise burst spend for that vendor.
              </Row>
            </div>
          </Section>

          <Section
            title="The activation loop"
            lead="Challenge 1's compounding, built not prose: four always-on loops that spend no recruiting money."
          >
            <div className="dg">
              <Row k="Invites per contributor">
                New contributors each contributor brings in. Above 1, the loop
                compounds on its own.
              </Row>
              <Row k="Answered from our own experts">
                The share of a coverage gap we can fill from the network before any
                cold outreach. Should rise every run.
              </Row>
              <Row k="Quiet experts brought back">
                Dormant experts re-prompted when the index first maps their
                company. Anything above zero is free supply.
              </Row>
              <Row k="Extra reviews per recruit">
                First-hand: one signup left six reviews. The ask is one; the yield
                is usually more.
              </Row>
            </div>
          </Section>

          <Section
            title="The honesty rules"
            lead="The register the whole prototype runs on."
          >
            <div className="dg">
              <Row k="Live vs simulated">
                Everything that runs, runs on real public data. Everything
                simulated — demand events, review counts, the expert base — is
                labelled where you see it.
              </Row>
              <Row k="Zeros are zeros">
                A lane that found nothing journals a zero. No invented evidence,
                ever.
              </Row>
              <Row k="Masking">
                Candidate identities are masked at the API layer — the browser
                never receives real names unless the single unmask toggle is used.
              </Row>
              <Row k="Costs on the ticker">
                Every run shows its own price, so no cost claim has to be taken on
                faith.
              </Row>
            </div>
          </Section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
