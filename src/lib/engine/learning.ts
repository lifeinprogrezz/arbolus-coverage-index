import { db } from "@/lib/db";

// The learning loop (build spec §6): per-lane yield from the run journal →
// budget share for the NEXT run. Real signals from real runs — no invented
// growth curves. Rendered on the coverage board.

export interface LaneYield {
  lane: string;
  runs: number;
  found: number;
  cost_usd: number;
  avg_latency_ms: number;
  yield_per_dollar: number | null; // null when the lane is free (cost 0)
  share_next: number; // normalized request-budget share for the next run
}

const LEARN_LANES = ["sitemap", "customer_pages", "wayback", "logo_diff", "ats", "peerspot", "serp"];

export async function laneYields(): Promise<LaneYield[]> {
  const supa = db();
  const { data } = await supa
    .from("run_journal")
    .select("lane, status, items_found, cost_usd, latency_ms")
    .in("lane", LEARN_LANES);

  const agg = new Map<string, { runs: number; found: number; cost: number; lat: number }>();
  for (const j of data ?? []) {
    const a = agg.get(j.lane) ?? { runs: 0, found: 0, cost: 0, lat: 0 };
    a.runs++;
    a.found += j.items_found ?? 0;
    a.cost += Number(j.cost_usd ?? 0);
    a.lat += j.latency_ms ?? 0;
    agg.set(j.lane, a);
  }

  // score = evidence per run, discounted by cost; free lanes score on yield alone
  const scores = new Map<string, number>();
  for (const lane of LEARN_LANES) {
    const a = agg.get(lane);
    if (!a || a.runs === 0) {
      scores.set(lane, 0.1); // unproven lanes keep a small exploration share
      continue;
    }
    const perRun = a.found / a.runs;
    const costPerRun = a.cost / a.runs;
    scores.set(lane, perRun / (1 + costPerRun * 10) + 0.1);
  }
  const total = [...scores.values()].reduce((x, y) => x + y, 0);

  return LEARN_LANES.map((lane) => {
    const a = agg.get(lane) ?? { runs: 0, found: 0, cost: 0, lat: 0 };
    return {
      lane,
      runs: a.runs,
      found: a.found,
      cost_usd: a.cost,
      avg_latency_ms: a.runs ? Math.round(a.lat / a.runs) : 0,
      yield_per_dollar: a.cost > 0.001 ? a.found / a.cost : null,
      share_next: (scores.get(lane) ?? 0) / total,
    };
  }).sort((x, y) => y.share_next - x.share_next);
}
