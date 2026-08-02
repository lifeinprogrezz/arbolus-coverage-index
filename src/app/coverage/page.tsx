import Link from "next/link";
import { db } from "@/lib/db";
import { laneYields } from "@/lib/engine/learning";
import { mapQueue } from "@/lib/engine/demand";
import AppHeader from "@/components/shell/app-header";
import SiteFooter from "@/components/shell/site-footer";
import CoLogo from "@/components/ui/co-logo";
import InfoHint from "@/components/ui/info-hint";
import { vendorName } from "../vendor-name";
import RequestCoverage from "./request-coverage";
import MapQueue from "./map-queue";

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

// plain names for the engine's internal lane keys
const LANE_LABEL: Record<string, string> = {
  sitemap: "Site map",
  customer_pages: "Customer pages",
  wayback: "Older page versions",
  logo_diff: "Logo-wall diff",
  ats: "Job posts",
  peerspot: "Review site",
  serp: "Web search",
};

function bookPill(
  seeds: number,
  reservoir: number,
  coverage: number
): { label: string; cls: string } {
  if (coverage >= 20) return { label: "covered", cls: "bg-city-london" };
  const depth = seeds + reservoir;
  if (depth >= 8) return { label: "warm book", cls: "bg-city-london" };
  if (depth >= 3) return { label: "thin book", cls: "bg-city-newdelhi" };
  return { label: "cold", cls: "bg-city-sanjose" };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return `${Math.floor(d / 30)}mo ago`;
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
      <AppHeader
        variant="paper"
        right={
          <Link
            href="/run"
            className="rounded-md bg-ink px-4 py-1.5 text-control font-medium !text-white no-underline transition-colors hover:bg-ink-hover active:bg-ink-active"
          >
            map a vendor
          </Link>
        }
      />

      <main className="relative z-[1] mx-auto max-w-6xl px-6 py-8">
        <section className="reveal mb-6">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-page">The index</h1>
            <span className="pill bg-city-sanjose">coverage simulated</span>
            <InfoHint>
              <p>
                Review counts stand in for Arbolus&rsquo;s own data, so they are
                simulated here. Everything else on this table is real, built from
                public evidence.
              </p>
              <p className="mt-2 font-medium text-ink">What the columns mean</p>
              <ul className="mt-1 flex flex-col gap-1">
                <li>
                  <span className="font-medium">Book</span> — how much we already
                  have on this vendor before anyone asks.
                </li>
                <li>
                  <span className="font-medium">People</span> — people we can name
                  from public evidence.
                </li>
                <li>
                  <span className="font-medium">Companies</span> — companies with
                  evidence they use the vendor. These are the targets for
                  room-level outreach.
                </li>
                <li>
                  <span className="font-medium">Reservoir</span> — experts already
                  in the Arbolus network who work at one of those companies.
                </li>
                <li>
                  <span className="font-medium">Excluded</span> — ruled out, with
                  the reason kept.
                </li>
              </ul>
            </InfoHint>
          </div>
          <p className="mt-1 text-body text-subtle">
            Every row is a book the 30-day clock can open warm.
          </p>
        </section>

        {vendors.length === 0 ? (
          <div className="pane reveal reveal-d1 p-8 text-center text-subtle">
            No vendors indexed yet — <Link href="/run">run the first map</Link>.
          </div>
        ) : (
          <section className="reveal reveal-d1">
            <div className="pane tracker-scroll overflow-x-auto">
              <table className="w-full border-collapse text-control">
                <thead>
                  <tr className="border-b border-line text-left text-dense uppercase tracking-wide text-subtle">
                    <th className="px-4 py-3 font-medium">Vendor</th>
                    <th className="px-3 py-3 font-medium">Book</th>
                    <th className="px-3 py-3 text-right font-medium">People</th>
                    <th className="px-3 py-3 text-right font-medium">Companies</th>
                    <th className="px-3 py-3 text-right font-medium">Reservoir</th>
                    <th className="px-3 py-3 text-right font-medium">Excluded</th>
                    <th className="px-3 py-3 text-right font-medium">Cost</th>
                    <th className="px-3 py-3 font-medium">Mapped</th>
                    <th className="py-3 pl-3 pr-5" />
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => {
                    const b = v.book_state ?? {};
                    const pill = bookPill(
                      b.seeds ?? 0,
                      b.reservoir_hits ?? 0,
                      v.coverage_now ?? 0
                    );
                    return (
                      <tr
                        key={v.id}
                        className="border-b border-line transition-colors last:border-0 hover:bg-ink/[.04]"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <CoLogo name={v.name} domain={v.domain} size={26} />
                            <div className="min-w-0 max-w-[170px]">
                              <div className="truncate font-medium text-ink">
                                {vendorName(v.name)}
                              </div>
                              <div className="provenance truncate">{v.domain}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`pill whitespace-nowrap ${pill.cls}`}>
                            {pill.label}
                          </span>
                        </td>
                        <td className="metric px-3 py-3 text-right">{b.seeds ?? 0}</td>
                        <td className="metric px-3 py-3 text-right">{b.keys ?? 0}</td>
                        <td className="metric px-3 py-3 text-right">
                          {b.reservoir_hits ?? 0}
                        </td>
                        <td className="metric px-3 py-3 text-right">{b.excluded ?? 0}</td>
                        <td className="metric whitespace-nowrap px-3 py-3 text-right">
                          ${Number(v.map_cost_usd ?? 0).toFixed(3)}
                        </td>
                        <td className="metric whitespace-nowrap px-3 py-3 text-dense text-subtle">
                          {timeAgo(v.last_mapped_at)}
                        </td>
                        <td className="min-w-[190px] whitespace-nowrap py-3 pl-3 pr-5">
                          <div className="flex items-center justify-end gap-2.5">
                            <RequestCoverage domain={v.domain} />
                            <Link
                              href={`/book/${v.domain}`}
                              className="whitespace-nowrap text-control"
                            >
                              book →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-t border-line px-4 py-2.5">
                <span className="whitespace-nowrap text-dense uppercase tracking-wide text-subtle">
                  <span
                    aria-hidden
                    className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-violet-400 align-[1px]"
                  />
                  Request coverage
                </span>
                <span className="text-dense text-subtle-deep">
                  records a client who searched and found nothing. The queue
                  reorders and the <Link href="/burst">burst budget</Link> is
                  released.
                </span>
                <span className="ml-auto">
                  <InfoHint align="right">
                    The front door no Arbolus page has today: a client says
                    &ldquo;I need coverage on this company&rdquo; and leaves a
                    trace. Every euro of burst spend then traces back to a
                    client who asked and left empty-handed. The events fired
                    here are simulated.
                  </InfoHint>
                </span>
              </div>
            </div>
          </section>
        )}

        {/* map queue — what gets indexed next */}
        {queueTop.length > 0 && (
          <section className="reveal reveal-d2 mt-10">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="eyebrow">Map queue</h2>
              <InfoHint>
                <p>
                  What gets indexed next, ranked by what clients actually asked
                  for. A search that came back empty counts ×3, a funding round
                  ×2, a client opening the company ×2, a watchlist entry ×1, and
                  being a competitor of a vendor we already index ×1.
                </p>
                <p className="mt-2">
                  Empty searches do two jobs: they order this queue and they
                  release the burst budget. The signals here are simulated; the
                  weights are written down, not learned.
                </p>
                <p className="mt-2">
                  In production the engine works this queue itself: when a
                  company&apos;s demand score crosses the threshold, that is what
                  authorises the crawl and its budget. No demand, no spend.
                  Books already indexed refresh by how hot they are: hot weekly,
                  warm monthly, cold quarterly. In this prototype runs are fired
                  by hand from Map run.
                </p>
              </InfoHint>
            </div>
            <MapQueue rows={queueTop} />
          </section>
        )}

        {/* learning loop — real per-lane economics */}
        <section className="reveal reveal-d3 mt-10">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="eyebrow">Learning loop</h2>
            <InfoHint>
              Measured across every real run: how many rows of evidence each lane
              returns per dollar spent. That sets its share of the next run&rsquo;s
              budget, so the lanes that pay off get more of it. Free lanes are
              ranked on rows alone.
            </InfoHint>
          </div>
          <div className="pane tracker-scroll overflow-x-auto">
            <table className="w-full border-collapse text-control">
              <thead>
                <tr className="border-b border-line text-left text-dense uppercase tracking-wide text-subtle">
                  <th className="px-4 py-2.5 font-medium">Lane</th>
                  <th className="px-3 py-2.5 text-right font-medium">Runs</th>
                  <th className="px-3 py-2.5 text-right font-medium">Evidence rows</th>
                  <th className="px-3 py-2.5 text-right font-medium">Cost</th>
                  <th className="px-3 py-2.5 text-right font-medium">Rows / $</th>
                  <th className="px-3 py-2.5 text-right font-medium">Time</th>
                  <th className="py-2.5 pl-3 pr-5 font-medium">Next run</th>
                </tr>
              </thead>
              <tbody>
                {yields.map((y) => (
                  <tr
                    key={y.lane}
                    className="border-b border-line transition-colors last:border-0 hover:bg-ink/[.04]"
                  >
                    <td className="px-4 py-2.5 text-control text-ink">
                      {LANE_LABEL[y.lane] ?? y.lane}
                    </td>
                    <td className="metric px-3 py-2.5 text-right">{y.runs}</td>
                    <td className="metric px-3 py-2.5 text-right">{y.found}</td>
                    <td className="metric whitespace-nowrap px-3 py-2.5 text-right">
                      ${y.cost_usd.toFixed(3)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {y.yield_per_dollar == null ? (
                        <span className="pill bg-city-sanjose">free</span>
                      ) : (
                        <span className="metric">{y.yield_per_dollar.toFixed(0)}</span>
                      )}
                    </td>
                    <td className="metric whitespace-nowrap px-3 py-2.5 text-right">
                      {(y.avg_latency_ms / 1000).toFixed(1)}s
                    </td>
                    <td className="py-2.5 pl-3 pr-5">
                      <div className="flex items-center gap-2">
                        <div className="dbar w-28">
                          <i style={{ width: `${Math.round(y.share_next * 100)}%` }} />
                        </div>
                        <span className="metric text-dense">
                          {Math.round(y.share_next * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
      <SiteFooter />
    </div>
  );
}
