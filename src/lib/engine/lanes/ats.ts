import type { Lane, LaneResult, Vendor, LaneCtx, EvidenceRow } from "../types";

// Lane 4 — ATS sweep:
// Greenhouse/Lever/Ashby public JSON job boards, grep JD bodies for the
// vendor name. "3 open roles require X" is the strongest company-level
// usage evidence — theirstack-class technographics for free.
// "replace/migrate off X" phrasing ⇒ churn signal.

const ORG_CAP = 12; // boards probed per run

interface GreenhouseJobs {
  jobs?: { title: string; absolute_url: string; content?: string; updated_at?: string }[];
}
interface LeverPosting {
  text: string;
  hostedUrl: string;
  descriptionPlain?: string;
  createdAt?: number;
}

function slugify(name: string): string[] {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
  return [...new Set([base.replace(/ /g, ""), base.replace(/ /g, "-")])].filter(Boolean);
}

const CHURN_RE = /\b(replace|replacing|migrat\w+ (?:off|away|from)|sunset\w*|deprecat\w+)\b/i;

export function atsLane(orgNames: string[]): Lane {
  return async (vendor: Vendor, ctx: LaneCtx): Promise<LaneResult> => {
    const t0 = Date.now();
    const lane = "ats";
    let requests = 0;
    const rows: EvidenceRow[] = [];
    const vendorRe = new RegExp(
      `\\b${vendor.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
      "i"
    );

    ctx.emit({ type: "lane_start", lane });

    const targets = orgNames.slice(0, ORG_CAP);
    for (const org of targets) {
      if (requests >= ctx.budget.maxRequests) break;
      const slugs = slugify(org);
      let hit = false;

      for (const slug of slugs) {
        if (hit) break;

        // Greenhouse
        const gh = await ctx.fetchJson<GreenhouseJobs>(
          `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
        );
        requests++;
        if (gh?.jobs?.length) {
          hit = true;
          const matches = gh.jobs.filter((j) => vendorRe.test(j.content ?? ""));
          for (const j of matches.slice(0, 3)) {
            const churn = CHURN_RE.test(j.content ?? "");
            const row: EvidenceRow = {
              org_name: org,
              evidence_type: "job_post",
              evidence_url: j.absolute_url,
              evidence_date: j.updated_at?.slice(0, 10),
              evidence_quote: `Open role "${j.title}" names ${vendor.name} in its requirements${churn ? " (migration/replacement phrasing — churn signal)" : ""}`,
              status: churn ? "churned" : "current",
            };
            rows.push(row);
            ctx.emit({ type: "evidence", lane, row });
          }
          if (matches.length > 0)
            ctx.emit({
              type: "lane_progress",
              lane,
              message: `${org}: ${matches.length} open roles name ${vendor.name} (greenhouse)`,
            });
          continue;
        }

        // Lever
        const lv = await ctx.fetchJson<LeverPosting[]>(
          `https://api.lever.co/v0/postings/${slug}?mode=json`
        );
        requests++;
        if (Array.isArray(lv) && lv.length) {
          hit = true;
          const matches = lv.filter((p) => vendorRe.test(p.descriptionPlain ?? ""));
          for (const p of matches.slice(0, 3)) {
            const churn = CHURN_RE.test(p.descriptionPlain ?? "");
            const row: EvidenceRow = {
              org_name: org,
              evidence_type: "job_post",
              evidence_url: p.hostedUrl,
              evidence_date: p.createdAt
                ? new Date(p.createdAt).toISOString().slice(0, 10)
                : undefined,
              evidence_quote: `Open role "${p.text}" names ${vendor.name} in its requirements${churn ? " (migration/replacement phrasing — churn signal)" : ""}`,
              status: churn ? "churned" : "current",
            };
            rows.push(row);
            ctx.emit({ type: "evidence", lane, row });
          }
        }
      }
    }

    const latency = Date.now() - t0;
    ctx.emit({
      type: "lane_done",
      lane,
      found: rows.length,
      cost_usd: 0,
      latency_ms: latency,
      note: `${targets.length} org boards probed (Anglo-locked lane; JP=HERP BR=Gupy IN=Naukri in production)`,
    });
    return { lane, rows, cost_usd: 0, latency_ms: latency, requests };
  };
}
