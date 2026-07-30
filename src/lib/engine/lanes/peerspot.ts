import type { Lane, LaneResult, Vendor, LaneCtx } from "../types";
import { jinaRead, jinaCost } from "../jina";
import { classifyPage, estimateClassifyCost } from "../classify";

// Lane 5 — PeerSpot (build spec §2.5): the only review site that fetches
// clean AND shows full name + title + employer; reviews name evaluated
// rivals ⇒ classes 1, 2, 4 from one crawl. (G2/TrustRadius 403 — routed
// around, never proxy-bypassed.)

export const peerspotLane: Lane = async (
  vendor: Vendor,
  ctx: LaneCtx
): Promise<LaneResult> => {
  const t0 = Date.now();
  const lane = "peerspot";
  let cost = 0;
  let requests = 0;
  const rows = [];

  ctx.emit({ type: "lane_start", lane });

  const slug = vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const candidates = [
    `https://www.peerspot.com/products/${slug}-reviews`,
    `https://www.peerspot.com/search?query=${encodeURIComponent(vendor.name)}`,
  ];

  for (const url of candidates) {
    if (rows.length > 0 || requests >= ctx.budget.maxRequests) break;
    ctx.emit({ type: "lane_progress", lane, message: "reading", url });
    const page = await jinaRead(url);
    requests++;
    if (page.status !== 200 || page.body.length < 500) continue;
    if (!/review/i.test(page.body)) continue;
    cost += jinaCost(page.body.length);

    const classified = await classifyPage({
      vendorName: vendor.name,
      vendorDomain: vendor.domain,
      competitorSet: vendor.competitor_set,
      sourceUrl: url,
      sourceKind: "PeerSpot review page (named reviewers with title + employer)",
      text: page.body,
    });
    cost += estimateClassifyCost(Math.min(page.body.length, 24_000));

    if (classified === null) {
      ctx.emit({ type: "lane_progress", lane, message: "unparseable — parked unclassified (retryable)", url });
      continue;
    }
    for (const row of classified) {
      row.evidence_type = "review_site";
      rows.push(row);
      ctx.emit({ type: "evidence", lane, row });
    }
  }

  const latency = Date.now() - t0;
  ctx.emit({
    type: "lane_done",
    lane,
    found: rows.length,
    cost_usd: cost,
    latency_ms: latency,
    note: "G2/TrustRadius 403 to automation — PeerSpot is the clean review lane",
  });
  return { lane, rows, cost_usd: cost, latency_ms: latency, requests };
};
