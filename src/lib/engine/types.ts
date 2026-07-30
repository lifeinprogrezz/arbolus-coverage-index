// Lane contract — every evidence lane implements this shape.
// A lane fetches public surfaces for one vendor and returns evidence rows;
// it never writes to the DB itself (the orchestrator owns writes + journal).

export interface Vendor {
  id: string;
  name: string;
  domain: string;
  category?: string | null;
  hq_country?: string | null;
  competitor_set: string[];
  exclusion_domains: string[];
}

export interface EvidenceRow {
  // company-level (customer_orgs)
  org_name: string;
  org_domain?: string;
  evidence_type:
    | "logo"
    | "case_study"
    | "job_post"
    | "procurement_award"
    | "forum"
    | "press"
    | "review_site"
    | "serp";
  evidence_url?: string;
  evidence_date?: string; // ISO date if known
  evidence_quote?: string;
  status?: "current" | "churned" | "evaluator";
  // person-level (candidates) — optional; many rows are org-only "keys"
  person?: {
    full_name: string;
    title?: string;
    employer?: string;
    employer_domain?: string;
    role_signal?: "decision_maker" | "user";
  };
}

export interface LaneResult {
  lane: string;
  rows: EvidenceRow[];
  cost_usd: number;
  latency_ms: number;
  requests: number;
  error?: string;
  note?: string; // human-short — journaled and rendered
  data?: unknown; // lane-to-orchestrator payload (e.g. sitemap harvest) — never journaled
}

export interface LaneCtx {
  fetchText: (
    url: string,
    init?: RequestInit & { timeoutMs?: number }
  ) => Promise<CachedResponse>;
  fetchJson: <T = unknown>(url: string, init?: RequestInit) => Promise<T | null>;
  emit: (event: LaneEvent) => void; // streaming progress → run view
  budget: { maxRequests: number };
}

export interface CachedResponse {
  status: number;
  body: string;
  fromCache: boolean;
}

export type LaneEvent =
  | { type: "lane_start"; lane: string }
  | { type: "lane_progress"; lane: string; message: string; url?: string }
  | { type: "evidence"; lane: string; row: EvidenceRow }
  | {
      type: "lane_done";
      lane: string;
      found: number;
      cost_usd: number;
      latency_ms: number;
      error?: string;
      note?: string;
    };

export type Lane = (vendor: Vendor, ctx: LaneCtx) => Promise<LaneResult>;
