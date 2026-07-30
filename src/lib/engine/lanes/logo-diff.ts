import type { Lane, LaneResult, Vendor, LaneCtx } from "../types";
import { jinaRead, jinaCost } from "../jina";
import { classifyPage, estimateClassifyCost } from "../classify";

// Lane 3b — archived logo-wall diff. The Internet Archive IS the time
// series: read the vendor's homepage as it looked ~2 years ago, extract the
// logo wall, and let the write stage drop any org that is STILL on today's
// pages. What remains = logos that were there and are gone — churn
// candidates with a snapshot citation. (Fetched through Jina Reader, so the
// archive sees Jina's crawlers, not our serverless egress.)

const SNAPSHOT_HINT = "2024"; // wayback redirects to the nearest snapshot

export const logoDiffLane: Lane = async (vendor: Vendor, ctx: LaneCtx): Promise<LaneResult> => {
  const t0 = Date.now();
  const lane = "logo_diff";
  let cost = 0;
  let requests = 0;
  const rows = [];

  ctx.emit({ type: "lane_start", lane });

  const archivedUrl = `https://web.archive.org/web/${SNAPSHOT_HINT}id_/https://${vendor.domain}/`;
  ctx.emit({ type: "lane_progress", lane, message: "reading archived homepage", url: archivedUrl });

  let page = await jinaRead(archivedUrl);
  requests++;
  if (page.status !== 200) {
    // keyless Jina blocks web.archive.org — fall back to a direct fetch
    // (works from local/pre-seed; serverless egress may be throttled, and
    // the lane says so instead of hiding it)
    ctx.emit({
      type: "lane_progress",
      lane,
      message: `jina ${page.status} on archive — direct fetch fallback`,
    });
    page = await ctx.fetchText(archivedUrl, { timeoutMs: 28_000 });
    requests++;
  }

  if (page.status === 200 && page.body.length > 500) {
    // direct-fetch fallback returns raw HTML — keep alt/aria text (where
    // logo names live), drop scripts/styles/tags before classification
    if (/^\s*<(!doctype|html)/i.test(page.body)) {
      page = {
        ...page,
        body: page.body
          .replace(/<script[\s\S]*?<\/script>/gi, " ")
          .replace(/<style[\s\S]*?<\/style>/gi, " ")
          .replace(/<(img|svg)[^>]*?(?:alt|aria-label)="([^"]+)"[^>]*>/gi, " [logo: $2] ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " "),
      };
    }
    cost += jinaCost(page.body.length);
    const classified = await classifyPage({
      vendorName: vendor.name,
      vendorDomain: vendor.domain,
      competitorSet: vendor.competitor_set,
      sourceUrl: archivedUrl,
      sourceKind: `ARCHIVED homepage snapshot (Wayback ~${SNAPSHOT_HINT}) — extract the customer logo wall`,
      text: page.body,
    });
    cost += estimateClassifyCost(Math.min(page.body.length, 24_000));

    if (classified === null) {
      ctx.emit({ type: "lane_progress", lane, message: "unparseable — parked unclassified (retryable)", url: archivedUrl });
    } else {
      for (const row of classified) {
        // every archived-wall org is a churn CANDIDATE until the write stage
        // sees it on a current surface and clears it
        const tentative = {
          ...row,
          status: "churned" as const,
          evidence_type: "logo" as const,
          evidence_url: archivedUrl,
          evidence_quote: `Logo on the ~${SNAPSHOT_HINT} archived homepage${row.evidence_quote ? ` — "${row.evidence_quote.slice(0, 120)}"` : ""} (churn candidate until seen on a current surface)`,
          person: undefined, // logo walls are org-level evidence
        };
        rows.push(tentative);
        ctx.emit({ type: "evidence", lane, row: tentative });
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
    note:
      page.status === 200
        ? `${rows.length} archived-wall orgs (write stage clears the still-current ones)`
        : `archive unreachable (${page.status}) — degrades to the nightly local lane, stated not hidden`,
  });
  return { lane, rows, cost_usd: cost, latency_ms: latency, requests };
};
