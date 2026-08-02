import type { Lane, LaneResult, Vendor, LaneCtx, EvidenceRow } from "../types";
import type { SitemapHarvest } from "./sitemap";

// Lane 3 — Wayback CDX diff: customer pages that EXISTED
// historically but are gone from the live sitemap ⇒ churned-customer
// CANDIDATES (class 2) with tenure dates. Flagged as candidate, not fact —
// redesigns and acquisitions cause false churn. The demo's wow moment.

export function waybackLane(harvest: SitemapHarvest): Lane {
  return async (vendor: Vendor, ctx: LaneCtx): Promise<LaneResult> => {
    const t0 = Date.now();
    const lane = "wayback";
    let requests = 0;
    const rows: EvidenceRow[] = [];

    ctx.emit({ type: "lane_start", lane });

    // find the live customer-path prefix to diff against
    const liveSet = new Set(
      harvest.customerPages.map((u) => new URL(u).pathname.replace(/\/$/, ""))
    );
    const prefix =
      harvest.customerPages.length > 0
        ? new URL(harvest.customerPages[0]).pathname.split("/").slice(0, 2).join("/")
        : "/customers";

    const cdxUrl = `https://web.archive.org/cdx/search/cdx?url=${vendor.domain}${prefix}/*&output=json&collapse=urlkey&fl=original,timestamp&limit=800`;
    ctx.emit({ type: "lane_progress", lane, message: `CDX query ${prefix}/*`, url: cdxUrl });

    // archive.org throttles shared cloud egress IPs — give CDX a long leash
    const res = await ctx.fetchText(cdxUrl, { timeoutMs: 28_000 });
    requests++;

    if (res.status === 200) {
      let entries: string[][] = [];
      try {
        entries = JSON.parse(res.body);
      } catch {
        entries = [];
      }
      // first row is the header
      const seen = new Map<string, { first: string; last: string }>();
      for (const [original, ts] of entries.slice(1)) {
        if (!original) continue;
        let path: string;
        try {
          path = new URL(
            original.replace(/^https?:\/\/(www\.)?/, `https://`)
          ).pathname.replace(/\/$/, "");
        } catch {
          continue;
        }
        if (!path.startsWith(prefix) || path === prefix) continue;
        const cur = seen.get(path);
        if (!cur) seen.set(path, { first: ts, last: ts });
        else {
          if (ts < cur.first) cur.first = ts;
          if (ts > cur.last) cur.last = ts;
        }
      }

      for (const [path, tenure] of seen) {
        if (liveSet.has(path)) continue; // still live — not churn
        const slug = path.split("/").pop() ?? "";
        if (!slug || slug.length < 3) continue;
        const orgName = slug
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
        const row: EvidenceRow = {
          org_name: orgName,
          evidence_type: "case_study",
          evidence_url: `https://web.archive.org/web/${tenure.last}/https://${vendor.domain}${path}`,
          evidence_date: `${tenure.last.slice(0, 4)}-${tenure.last.slice(4, 6)}-${tenure.last.slice(6, 8)}`,
          evidence_quote: `Customer page existed ${tenure.first.slice(0, 4)}–${tenure.last.slice(0, 4)}, removed from live site (churn candidate, not fact)`,
          status: "churned",
        };
        rows.push(row);
        ctx.emit({ type: "evidence", lane, row });
      }
    }

    const latency = Date.now() - t0;
    const throttled = res.status !== 200;
    ctx.emit({
      type: "lane_done",
      lane,
      found: rows.length,
      cost_usd: 0,
      latency_ms: latency,
      note: throttled
        ? "archive.org throttles cloud egress — lane degrades to the nightly local pre-seed (stated, not hidden)"
        : rows.length > 0
        ? `${rows.length} disappeared customer pages`
        : "no diff signal",
    });
    return { lane, rows, cost_usd: 0, latency_ms: latency, requests };
  };
}
