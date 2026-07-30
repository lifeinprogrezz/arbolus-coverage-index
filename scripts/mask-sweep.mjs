// Masking QA sweep (audit 42 §5 — run before every send/freeze):
// pulls every real name in the index, then greps every RENDERED surface and
// public API response for any token of any name. Zero hits = pass.
// Usage: node --env-file=.env.local scripts/mask-sweep.mjs [baseUrl] [gatePassword]
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const BASE = process.argv[2] ?? "http://localhost:3000";
const GATE = process.argv[3];

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

const { data: cands } = await supa.from("candidates").select("full_name");
const { data: vendors } = await supa
  .from("vendors")
  .select("domain")
  .not("last_mapped_at", "is", null);

// detect FULL names ("mark yates") and distinctive surnames (≥5 chars) —
// bare first names collide with code identifiers (performance.mark) and
// common English words
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const tokens = new Set(); // each entry is an already-escaped regex source
for (const c of cands ?? []) {
  const parts = (c.full_name ?? "").trim().toLowerCase().split(/\s+/);
  if (parts.length >= 2) tokens.add(parts.map(esc).join("\\s+"));
  const surname = parts[parts.length - 1];
  if (surname && surname.length >= 5) tokens.add(esc(surname));
}

const surfaces = [
  "/",
  "/coverage",
  "/burst",
  "/loop",
  "/api/vendors",
  ...(vendors ?? []).map((v) => `/book/${v.domain}`),
  ...(vendors ?? []).map((v) => `/join/${v.domain}`),
];

const headers = GATE ? { cookie: `ci_gate=${GATE}` } : {};
let failures = 0;
for (const path of surfaces) {
  let body = "";
  try {
    const res = await fetch(BASE + path, { headers, signal: AbortSignal.timeout(30000) });
    body = (await res.text()).toLowerCase();
    if (res.status !== 200) {
      console.log(`?? ${path} -> HTTP ${res.status}`);
      failures++;
      continue;
    }
  } catch (e) {
    console.log(`?? ${path} -> ${String(e).slice(0, 60)}`);
    failures++;
    continue;
  }
  const hits = [...tokens].filter((t) => new RegExp(`\\b${t}\\b`).test(body));
  if (hits.length) {
    failures++;
    console.log(`LEAK ${path}: ${hits.join(", ")}`);
  } else {
    console.log(`ok   ${path}`);
  }
}

// the SSE replay stream for the first mapped vendor
const first = (vendors ?? [])[0]?.domain;
if (first) {
  const res = await fetch(`${BASE}/api/run?domain=${first}&replay=1`, {
    headers,
    signal: AbortSignal.timeout(120000),
  });
  const body = (await res.text()).toLowerCase();
  const hits = [...tokens].filter((t) => new RegExp(`\\b${t}\\b`).test(body));
  if (hits.length) {
    failures++;
    console.log(`LEAK /api/run replay: ${hits.join(", ")}`);
  } else {
    console.log(`ok   /api/run replay (${first})`);
  }
}

console.log(failures === 0 ? "\nMASK SWEEP: PASS" : `\nMASK SWEEP: ${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
