import type { Lane, LaneResult, Vendor, LaneCtx } from "../types";

// Lane 1 — sitemap fetch. The highest-yield single call (build spec §2.1):
// harvests customer/case-study page URLs, competitor "alternative" pages,
// and integration directories. Feeds the customer-pages lane and the
// Wayback diff. Emits no evidence rows itself — it writes the treasure map.

export interface SitemapHarvest {
  customerPages: string[];
  alternativePages: string[];
  integrationPages: string[];
  competitorsDetected: string[];
  allUrls: string[];
}

const CUSTOMER_RE =
  /\/(customers?|case-stud(?:y|ies)|success-stor(?:y|ies)|testimonials?|clientes?|導入事例|导入事例)(\/|$|\.)/i;
const ALTERNATIVE_RE = /\/([a-z0-9-]+)-alternative|\/switch(?:ing)?-from-([a-z0-9-]+)/i;
const INTEGRATION_RE = /\/(integrations?|partners?|marketplace|apps)(\/|$|\.)/i;

function extractLocs(xml: string): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<]+?)\s*<\/loc>/g;
  let m;
  while ((m = re.exec(xml)) !== null) locs.push(m[1]);
  return locs;
}

export const sitemapLane: Lane = async (vendor: Vendor, ctx: LaneCtx): Promise<LaneResult> => {
  const t0 = Date.now();
  let requests = 0;
  const harvest: SitemapHarvest = {
    customerPages: [],
    alternativePages: [],
    integrationPages: [],
    competitorsDetected: [],
    allUrls: [],
  };

  ctx.emit({ type: "lane_start", lane: "sitemap" });

  const roots = [
    `https://${vendor.domain}/sitemap.xml`,
    `https://${vendor.domain}/sitemap_index.xml`,
    `https://www.${vendor.domain}/sitemap.xml`,
  ];

  let urls: string[] = [];
  for (const root of roots) {
    const res = await ctx.fetchText(root);
    requests++;
    if (res.status === 200 && res.body.includes("<loc>")) {
      urls = extractLocs(res.body);
      ctx.emit({
        type: "lane_progress",
        lane: "sitemap",
        message: `sitemap found: ${urls.length} urls`,
        url: root,
      });
      // sitemap index → follow child sitemaps (cap 5)
      const children = urls.filter((u) => u.endsWith(".xml")).slice(0, 5);
      if (children.length > 0 && children.length === urls.length) {
        urls = [];
        for (const child of children) {
          const cres = await ctx.fetchText(child);
          requests++;
          if (cres.status === 200) urls.push(...extractLocs(cres.body));
        }
      }
      break;
    }
  }

  for (const u of urls) {
    harvest.allUrls.push(u);
    if (CUSTOMER_RE.test(u)) harvest.customerPages.push(u);
    else if (INTEGRATION_RE.test(u)) harvest.integrationPages.push(u);
    const alt = u.match(ALTERNATIVE_RE);
    if (alt) {
      harvest.alternativePages.push(u);
      const rival = (alt[1] || alt[2] || "").replace(/-/g, " ").trim();
      if (rival && !harvest.competitorsDetected.includes(rival))
        harvest.competitorsDetected.push(rival);
    }
  }

  ctx.emit({
    type: "lane_done",
    lane: "sitemap",
    found: harvest.customerPages.length + harvest.alternativePages.length,
    cost_usd: 0,
    latency_ms: Date.now() - t0,
    note: `${harvest.customerPages.length} customer pages · ${harvest.alternativePages.length} rival pages · ${harvest.competitorsDetected.length} competitors self-declared`,
  });

  return {
    lane: "sitemap",
    rows: [],
    cost_usd: 0,
    latency_ms: Date.now() - t0,
    requests,
    note: JSON.stringify(harvest),
  };
};
