import Link from "next/link";
import { db } from "@/lib/db";
import { laneYields } from "@/lib/engine/learning";
import { mapQueue } from "@/lib/engine/demand";

export const dynamic = "force-dynamic";

// Coverage board (build spec §7.1) — the index at a glance, paper skin.
// Includes the "request coverage" front door that exists on no Arbolus
// page today (03-design §3.2).

interface VendorRow {
  id: string;
  name: string;
  domain: string;
  category: string | null;
  hq_country: string | null;
  competitor_set: string[];
  coverage_now: number;
  coverage_simulated: boolean;
  demand_score: number;
  map_tier: string;
  book_state: {
    seeds?: number;
    keys?: number;
    excluded?: number;
    reservoir_hits?: number;
  } | null;
  last_mapped_at: string | null;
  map_cost_usd: number;
}

function tierPill(tier: string): string {
  if (tier === "hot") return "bg-city-newyork";
  if (tier === "warm") return "bg-city-newdelhi";
  return "bg-city-sanjose";
}

function bookPill(seeds: number, reservoir: number): { label: string; cls: string } {
  const depth = seeds + reservoir;
  if (depth >= 8) return { label: "warm book", cls: "bg-city-london" };
  if (depth >= 3) return { label: "thin book", cls: "bg-city-newdelhi" };
  return { label: "cold", cls: "bg-city-sanjose" };
}

export default async function CoveragePage() {
  const [{ data }, yields, queue] = await Promise.all([
    db()
      .from("vendors")
      .select("*")
      .order("last_mapped_at", { ascending: false, nullsFirst: false }),
    laneYields(),
    mapQueue(),
  ]);
  const vendors = (data ?? []) as VendorRow[];
  const queueTop = queue.filter((q) => q.demand_score > 0).slice(0, 6);

  return (
    <div className="page-grain min-h-screen">
      <header className="glass sticky top-0 z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-semibold !text-ink no-underline">
              Coverage Index
            </Link>
            <span className="pill bg-city-barcelona">coverage board</span>
          </div>
          <Link
            href="/run"
            className="rounded-md bg-ink px-4 py-1.5 text-sm font-medium !text-white no-underline hover:bg-ink-hover"
          >
            map a vendor
          </Link>
        </div>
      </header>

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h1 className="text-xl">The index</h1>
            <p className="mt-1 text-sm text-subtle">
              Built ahead of demand — every vendor row is a book the 30-day clock can
              open warm. Coverage counts are{" "}
              <span className="pill bg-city-sanjose">simulated</span> (Arbolus-internal
              data); book depth is real, from public evidence.
            </p>
          </div>
        </div>

        {vendors.length === 0 ? (
          <div className="rounded-md border border-line bg-card p-8 text-center text-subtle shadow-[var(--shadow-card)]">
            No vendors indexed yet —{" "}
            <Link href="/run">run the first map</Link>.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border border-line bg-card shadow-[var(--shadow-card)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-subtle">
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Book</th>
                  <th className="px-4 py-3 text-right">Seeds</th>
                  <th className="px-4 py-3 text-right">Org keys</th>
                  <th className="px-4 py-3 text-right">Reservoir</th>
                  <th className="px-4 py-3 text-right">Excluded</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3 text-right">Map cost</th>
                  <th className="px-4 py-3">Last mapped</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {vendors.map((v) => {
                  const b = v.book_state ?? {};
                  const pill = bookPill(b.seeds ?? 0, b.reservoir_hits ?? 0);
                  return (
                    <tr key={v.id} className="border-b border-line last:border-0 hover:bg-ink/[.04]">
                      <td className="px-4 py-3">
                        <div className="font-medium text-ink">{v.name}</div>
                        <div className="provenance">{v.domain}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`pill ${pill.cls}`}>{pill.label}</span>
                      </td>
                      <td className="metric px-4 py-3 text-right">{b.seeds ?? 0}</td>
                      <td className="metric px-4 py-3 text-right">{b.keys ?? 0}</td>
                      <td className="metric px-4 py-3 text-right">{b.reservoir_hits ?? 0}</td>
                      <td className="metric px-4 py-3 text-right">{b.excluded ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`pill ${tierPill(v.map_tier)}`}>{v.map_tier}</span>
                      </td>
                      <td className="metric px-4 py-3 text-right">
                        ${Number(v.map_cost_usd ?? 0).toFixed(3)}
                      </td>
                      <td className="metric px-4 py-3 text-xs text-subtle">
                        {v.last_mapped_at
                          ? new Date(v.last_mapped_at).toISOString().slice(0, 16).replace("T", " ")
                          : "never"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/book/${v.domain}`} className="text-sm">
                          book →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* map queue — what gets indexed next */}
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-ink">
            Map queue{" "}
            <span className="metric text-xs font-normal text-subtle">
              what gets indexed next — demand-ranked (signals simulated, weights documented)
            </span>
          </h2>
          <div className="flex flex-col gap-1.5">
            {queueTop.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center gap-3 rounded-md border border-line bg-card px-4 py-2.5 shadow-[var(--shadow-card)]"
              >
                <span className="metric w-6 text-right text-sm text-subtle">{i + 1}</span>
                <div className="w-40">
                  <div className="text-sm font-medium text-ink">{q.name}</div>
                  <div className="provenance">{q.domain}</div>
                </div>
                <span className="metric w-14 text-right text-violet-link">
                  {q.demand_score.toFixed(1)}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {q.signals.map((s) => (
                    <span
                      key={s}
                      className={`pill ${
                        s === "searched-empty"
                          ? "bg-city-newyork"
                          : s === "funding"
                          ? "bg-city-newdelhi"
                          : s === "client-view"
                          ? "bg-city-barcelona"
                          : "bg-city-sanjose"
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <span className={`pill ml-auto ${q.mapped ? "bg-city-london" : "bg-city-sanjose"}`}>
                  {q.mapped ? "indexed — re-map queued" : "unmapped"}
                </span>
              </div>
            ))}
          </div>
          <p className="provenance mt-2">
            weights: searched-and-empty ×3 · funding ×2 · client-view ×2 · watchlist ×1 ·
            competitor-of-indexed ×1 — the searched-and-empty log both orders this queue AND
            authorises the burst budget
          </p>
        </section>

        {/* learning loop — real per-lane economics */}
        <section className="mt-8">
          <h2 className="mb-2 text-base font-semibold text-ink">
            Learning loop{" "}
            <span className="metric text-xs font-normal text-subtle">
              real per-lane yield across all runs — reallocates the next run&rsquo;s budget
            </span>
          </h2>
          <div className="overflow-x-auto rounded-md border border-line bg-card shadow-[var(--shadow-card)]">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs font-medium uppercase tracking-wide text-subtle">
                  <th className="px-4 py-2">Lane</th>
                  <th className="px-4 py-2 text-right">Runs</th>
                  <th className="px-4 py-2 text-right">Evidence rows</th>
                  <th className="px-4 py-2 text-right">Cost</th>
                  <th className="px-4 py-2 text-right">Rows / $</th>
                  <th className="px-4 py-2 text-right">Avg latency</th>
                  <th className="px-4 py-2">Next-run share</th>
                </tr>
              </thead>
              <tbody>
                {yields.map((y) => (
                  <tr key={y.lane} className="border-b border-line last:border-0">
                    <td className="metric px-4 py-2">{y.lane}</td>
                    <td className="metric px-4 py-2 text-right">{y.runs}</td>
                    <td className="metric px-4 py-2 text-right">{y.found}</td>
                    <td className="metric px-4 py-2 text-right">${y.cost_usd.toFixed(3)}</td>
                    <td className="metric px-4 py-2 text-right">
                      {y.yield_per_dollar == null ? "free" : y.yield_per_dollar.toFixed(0)}
                    </td>
                    <td className="metric px-4 py-2 text-right">{(y.avg_latency_ms / 1000).toFixed(1)}s</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-28 overflow-hidden rounded-full bg-ink/[.06]">
                          <div
                            className="h-full rounded-full bg-violet-link"
                            style={{ width: `${Math.round(y.share_next * 100)}%` }}
                          />
                        </div>
                        <span className="metric text-xs">{Math.round(y.share_next * 100)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* the missing front door */}
        <div className="mt-8 rounded-lg border border-violet-100 bg-violet-50 p-5">
          <h2 className="text-base font-semibold text-ink">Request coverage</h2>
          <p className="mt-1 max-w-2xl text-sm text-subtle-deep">
            The client-side front door that exists on no Arbolus page today: a client
            names a company, the demand event authorises the budget, the clock starts —
            warm. In this prototype the same action is the{" "}
            <Link href="/run">map-a-vendor run</Link>.
          </p>
        </div>
      </main>
    </div>
  );
}
