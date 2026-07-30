// Shared shapes for the /run terminal — state lives in page.tsx,
// render lives in the sub-components (lane-board, evidence-feed, …).

export type LaneState = {
  key: string;
  label: string;
  mode: "live" | "local" | "dark";
  status: "idle" | "running" | "done" | "error";
  found: number;
  cost: number;
  latency: number | null;
  note?: string;
};

export type FeedItem = {
  id: number;
  lane: string;
  org: string;
  status?: string;
  title?: string;
  masked?: boolean;
  kind: "evidence" | "exclusion" | "info";
  text?: string;
};

// The seeded note on local lanes — rendered as the "nightly · local" tag,
// so the note column stays free for real lane output.
export const LOCAL_NOTE = "pre-seeded nightly — local lane";

export const INITIAL_LANES: LaneState[] = [
  { key: "sitemap", label: "01 sitemap harvest", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "customer_pages", label: "02 customer pages", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "wayback", label: "03 wayback churn diff", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "logo_diff", label: "03b logo-wall diff", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "ats", label: "04 ats job-post sweep", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "peerspot", label: "05 peerspot reviews", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "serp", label: "06 serp long-tail", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
  { key: "community", label: "07 community (discourse)", mode: "local", status: "idle", found: 0, cost: 0, latency: null, note: LOCAL_NOTE },
  { key: "procurement", label: "08 procurement (eu ted)", mode: "local", status: "idle", found: 0, cost: 0, latency: null, note: LOCAL_NOTE },
  { key: "github", label: "09 github (verify-only)", mode: "local", status: "idle", found: 0, cost: 0, latency: null, note: LOCAL_NOTE },
  // short label on purpose — "classify · exclude · write" truncated at 1440
  { key: "classify", label: "10 classify · write", mode: "live", status: "idle", found: 0, cost: 0, latency: null },
];
