import type { Lane, LaneResult, Vendor, LaneCtx, EvidenceRow } from "../types";
import type { SitemapHarvest } from "./sitemap";
import { jinaRead, jinaCost } from "../jina";
import { classifyPage, estimateClassifyCost } from "../classify";

// Lane 2 — customer-page extraction (build spec §2.2): named individuals
// (name + title + employer) and org logos from the vendor's own marketing
// pages. Classes 1 (and 4 from the /{rival}-alternative pages).

const PAGE_CAP = 8; // per-run budget; the rest queue for the nightly pre-seed

export function customerPagesLane(harvest: SitemapHarvest): Lane {
  return async (vendor: Vendor, ctx: LaneCtx): Promise<LaneResult> => {
    const t0 = Date.now();
    const lane = "customer_pages";
    let cost = 0;
    let requests = 0;
    const rows: EvidenceRow[] = [];

    ctx.emit({ type: "lane_start", lane });

    const targets = [
      ...harvest.customerPages,
      ...harvest.alternativePages,
    ].slice(0, PAGE_CAP);

    if (targets.length === 0) {
      // no sitemap harvest — fall back to conventional paths
      targets.push(
        `https://${vendor.domain}/customers`,
        `https://${vendor.domain}/case-studies`
      );
    }

    for (const url of targets) {
      if (requests >= ctx.budget.maxRequests) break;
      ctx.emit({ type: "lane_progress", lane, message: "reading", url });
      const page = await jinaRead(url);
      requests++;
      if (page.status !== 200 || page.body.length < 200) continue;
      cost += jinaCost(page.body.length);

      const classified = await classifyPage({
        vendorName: vendor.name,
        vendorDomain: vendor.domain,
        competitorSet: vendor.competitor_set,
        sourceUrl: url,
        sourceKind: "vendor customer/case-study page",
        text: page.body,
      });
      cost += estimateClassifyCost(Math.min(page.body.length, 24_000));

      for (const row of classified) {
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
      note: `${targets.length} pages read`,
    });
    return { lane, rows, cost_usd: cost, latency_ms: latency, requests };
  };
}
