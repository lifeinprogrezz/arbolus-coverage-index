import Link from "next/link";

const SURFACES = [
  {
    href: "/coverage",
    title: "Coverage board",
    desc: "The index at a glance — vendors, book depth, demand, priority queue.",
    state: "in build",
  },
  {
    href: "/run",
    title: "Map run",
    desc: "The 10 lanes lighting up live: evidence streaming in, per-lane cost and latency.",
    state: "in build",
  },
  {
    href: "/book",
    title: "Book view",
    desc: "Masked candidates, persona classes, evidence chains, exclusions with reasons.",
    state: "in build",
  },
  {
    href: "/burst",
    title: "Burst view",
    desc: "The 30-day clock: playbook stages, path to 20, cost vs the manual baseline.",
    state: "in build",
  },
  {
    href: "/loop",
    title: "Activation loop",
    desc: "Conversion page, 5-review unlock, colleague invites, the compounding metrics.",
    state: "in build",
  },
];

function laneStatus() {
  return [
    { name: "sitemap", lit: true },
    { name: "customer pages", lit: true },
    { name: "wayback diff", lit: true },
    { name: "ats sweep", lit: true },
    { name: "peerspot", lit: true },
    { name: "serp long-tail", lit: Boolean(process.env.SERPER_API_KEY) },
    { name: "claude classify", lit: Boolean(process.env.ANTHROPIC_API_KEY) },
    {
      name: "supabase index",
      lit: Boolean(
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY
      ),
    },
  ];
}

export default function Home() {
  const lanes = laneStatus();
  return (
    <div className="page-grain min-h-screen">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] bg-violet-400 font-mono text-sm font-bold text-white">
              C
            </span>
            <span className="font-semibold">Coverage Index</span>
            <span className="pill bg-city-barcelona">prototype</span>
          </div>
          <span className="provenance">Arbolus growth case · build day 1</span>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-5xl px-6 py-12">
        <p className="max-w-2xl text-lg leading-relaxed text-ink">
          The index is built <em>ahead of demand</em> from public evidence, with
          provenance and eligibility rules — so when the 30-day clock starts, the
          trigger looks up a <strong>warm book</strong> instead of starting a cold
          search.
        </p>

        <h2 className="mt-10 mb-3 text-sm font-medium uppercase tracking-wide text-subtle">
          Surfaces
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {SURFACES.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-md border border-line bg-card p-4 no-underline shadow-[var(--shadow-card)] transition-shadow hover:shadow-[var(--shadow-raised)]"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink">{s.title}</span>
                <span className="pill bg-city-newdelhi">{s.state}</span>
              </div>
              <p className="mt-1 text-sm text-subtle">{s.desc}</p>
            </Link>
          ))}
        </div>

        <h2 className="mt-10 mb-3 text-sm font-medium uppercase tracking-wide text-subtle">
          Engine lanes
        </h2>
        <div className="flex flex-wrap gap-2">
          {lanes.map((l) => (
            <span
              key={l.name}
              className={`pill ${l.lit ? "bg-city-london" : "bg-city-sanjose"}`}
              title={l.lit ? "live" : "dark — key not configured"}
            >
              {l.name} {l.lit ? "· live" : "· dark"}
            </span>
          ))}
        </div>
        <p className="provenance mt-3">
          A dark lane names why it is dark — the engine degrades under stated
          rules, it never pretends.
        </p>
      </main>
    </div>
  );
}
