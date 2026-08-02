import type { Lane, LaneResult, Vendor, LaneCtx } from "../types";
import { jinaRead, jinaCost } from "../jina";
import { classifyPage, estimateClassifyCost } from "../classify";

// Lane 6 — SERP long-tail: "migrating off X", "X vs Y",
// "we use X", "why we left X" via Serper ⇒ classes 2, 4.
// Without a SERPER_API_KEY the lane reports itself dark — the channel-
// legality/availability mask renders WHY, it never silently skips.

const SERPER_COST_PER_QUERY = 0.001; // $50/50k credits
const QUERIES = (v: Vendor) => [
  `"migrating off ${v.name}"`,
  `"why we left ${v.name}"`,
  `"we use ${v.name}" site:reddit.com OR site:news.ycombinator.com`,
  `"${v.name}" review "we switched"`,
];

interface SerperResult {
  organic?: { title: string; link: string; snippet?: string; date?: string }[];
}

export const serpLane: Lane = async (vendor: Vendor, ctx: LaneCtx): Promise<LaneResult> => {
  const t0 = Date.now();
  const lane = "serp";
  const key = process.env.SERPER_API_KEY;
  let cost = 0;
  let requests = 0;
  const rows = [];

  ctx.emit({ type: "lane_start", lane });

  if (!key) {
    const latency = Date.now() - t0;
    const note = "lane dark: no SERPER_API_KEY configured — add key to light up";
    ctx.emit({ type: "lane_done", lane, found: 0, cost_usd: 0, latency_ms: latency, error: note });
    return { lane, rows: [], cost_usd: 0, latency_ms: latency, requests: 0, error: note };
  }

  const seen = new Set<string>();
  for (const q of QUERIES(vendor)) {
    if (requests >= ctx.budget.maxRequests) break;
    ctx.emit({ type: "lane_progress", lane, message: `query: ${q}` });
    let data: SerperResult | null = null;
    try {
      const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: { "X-API-KEY": key, "content-type": "application/json" },
        body: JSON.stringify({ q, num: 10 }),
        signal: AbortSignal.timeout(15000),
      });
      requests++;
      cost += SERPER_COST_PER_QUERY;
      if (res.ok) data = (await res.json()) as SerperResult;
    } catch {
      continue;
    }

    // read the top organic hits that look first-hand (cap 2 per query)
    const targets = (data?.organic ?? [])
      .filter((r) => !seen.has(r.link))
      .slice(0, 2);
    for (const r of targets) {
      seen.add(r.link);
      const page = await jinaRead(r.link);
      requests++;
      if (page.status !== 200 || page.body.length < 300) continue;
      cost += jinaCost(page.body.length);

      const classified = await classifyPage({
        vendorName: vendor.name,
        vendorDomain: vendor.domain,
        competitorSet: vendor.competitor_set,
        sourceUrl: r.link,
        sourceKind: `SERP long-tail hit for query ${q}`,
        text: page.body,
      });
      cost += estimateClassifyCost(Math.min(page.body.length, 24_000));
      if (classified === null) {
        ctx.emit({ type: "lane_progress", lane, message: "unparseable — parked unclassified (retryable)", url: r.link });
        continue;
      }
      for (const row of classified) {
        rows.push(row);
        ctx.emit({ type: "evidence", lane, row });
      }
    }
  }

  const latency = Date.now() - t0;
  ctx.emit({
    type: "lane_done",
    lane,
    found: rows.length,
    cost_usd: cost,
    latency_ms: latency,
    note: `${requests} requests · geography-neutral lane (localized query templates in production)`,
  });
  return { lane, rows, cost_usd: cost, latency_ms: latency, requests };
};
