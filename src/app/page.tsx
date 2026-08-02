import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";
import InfoHint from "@/components/ui/info-hint";
import SurfaceCards from "./surface-cards";

// The case's cover page. Reads in 10 seconds: thesis → five surfaces →
// lane status → city footer. Rationale lives in InfoHint, not prose.

type LaneChip = { name: string; state: "live" | "nightly" | "dark" };

// Mirrors the run view's lane registry (run/run-types.ts INITIAL_LANES) —
// same names, same order. Nightly lanes run on a schedule, not inside a run.
function laneStatus(): LaneChip[] {
  return [
    { name: "sitemap", state: "live" },
    { name: "customer pages", state: "live" },
    { name: "wayback diff", state: "live" },
    { name: "logo-wall diff", state: "live" },
    { name: "ats sweep", state: "live" },
    { name: "peerspot", state: "live" },
    { name: "serp", state: process.env.SERPER_API_KEY ? "live" : "dark" },
    { name: "community", state: "nightly" },
    { name: "procurement", state: "nightly" },
    { name: "github", state: "nightly" },
    { name: "classify", state: process.env.ANTHROPIC_API_KEY ? "live" : "dark" },
  ];
}

export default function Home() {
  const lanes = laneStatus();
  return (
    <div className="page-grain flex min-h-screen flex-col">
      <AppHeader
        variant="paper"
        right={<span className="pill bg-city-sanjose">prototype</span>}
      />

      <main className="relative z-[1] mx-auto w-full max-w-5xl flex-1 px-6 pb-16">
        {/* hero */}
        <section className="reveal pt-14">
          <p className="eyebrow">Arbolus growth case</p>
          <h1 className="mt-4 max-w-3xl text-display tracking-[-0.01em] text-ink md:text-[40px] md:leading-[46px]">
            The index is built ahead of demand, so the clock starts warm.
          </h1>
          <p className="mt-3 max-w-xl text-pretty text-body text-subtle-deep">
            We read the public evidence about B2B software vendors and turn it
            into a book of customers we can name and verify.
          </p>
        </section>

        {/* the five surfaces */}
        <section className="reveal reveal-d1 mt-10">
          <SurfaceCards />
        </section>

        {/* engine lanes */}
        <section className="reveal reveal-d2 mt-12">
          <div className="flex items-center gap-2">
            <h2 className="eyebrow">Engine lanes</h2>
            <InfoHint>
              <p>
                Each lane is one way of finding evidence. A dark lane has no API
                key in this build, so it is skipped and shown dark. Its output is
                never faked.
              </p>
              <p className="mt-2">
                Nightly lanes run on a schedule rather than inside a live run, so
                a run never waits on them.
              </p>
              <p className="mt-2">
                The index itself is a Supabase database. That is where every
                lane writes, so it is not a lane of its own.
              </p>
            </InfoHint>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {lanes.map((l) => (
              <span
                key={l.name}
                title={
                  l.state === "live"
                    ? "live in every run"
                    : l.state === "nightly"
                      ? "runs nightly, not inside a run"
                      : "dark — no key configured in this build"
                }
                className={`pill ${
                  l.state === "live"
                    ? "bg-city-london"
                    : l.state === "nightly"
                      ? "bg-city-sanjose"
                      : "bg-city-sanjose !text-ink-60"
                }`}
              >
                <span
                  aria-hidden
                  className={`h-1.5 w-1.5 rounded-full ${
                    l.state === "live"
                      ? "bg-success"
                      : l.state === "nightly"
                        ? "bg-violet-400"
                        : "border border-ink-35"
                  }`}
                />
                {l.name}
                {l.state === "nightly" && (
                  <span className="text-ink-60">· nightly</span>
                )}
              </span>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
