// Nightly local pre-seed worker — the "local lane" half of the fetch/local
// architecture split (research file 13 §0). Runs the three lanes that don't
// suit Vercel egress (TED procurement, GitHub verify-only, Discourse
// community probe) from THIS machine, and journals results with status
// 'local_preseed' so the run view renders their slots honestly.
// Zeros are journaled as zeros — no invented evidence, ever.
//
// Usage: node --env-file=.env.local scripts/preseed.mjs
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "child_process";
import { randomUUID } from "crypto";
import ws from "ws";

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

const { data: vendors } = await supa
  .from("vendors")
  .select("id, name, domain")
  .not("last_mapped_at", "is", null);

async function journal(vendor, lane, result) {
  await supa.from("run_journal").insert({
    run_id: randomUUID(),
    vendor_id: vendor.id,
    lane,
    status: "local_preseed",
    items_found: result.found,
    cost_usd: 0,
    latency_ms: result.ms,
    detail: { note: result.note, seeded_at: new Date().toISOString() },
  });
}

// --- EU TED procurement: award notices naming the vendor (anonymous API) ---
// Entity-resolution rule (learned live 7-30, junk purged twice): common-word
// vendor names ("Vertice", "Factorial") exact-match unrelated notices. Only
// DOMAIN-anchored matches enter the book; name-only matches are counted and
// HELD OUT pending entity resolution — a production disambiguation step.
async function tedSearch(query) {
  const res = await fetch("https://api.ted.europa.eu/v3/notices/search", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, fields: ["ND", "TI", "PD"], limit: 10 }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`TED API ${res.status}`);
  return (await res.json())?.notices ?? [];
}

async function tedLane(vendor) {
  const t0 = Date.now();
  try {
    const anchored = await tedSearch(`FT="${vendor.domain}"`);
    const nameOnly = await tedSearch(`FT="${vendor.name}"`);
    let written = 0;
    for (const n of anchored.slice(0, 5)) {
      const title = typeof n.TI === "object" ? Object.values(n.TI)[0] : n.TI;
      const { error } = await supa.from("customer_orgs").upsert(
        {
          vendor_id: vendor.id,
          org_name: String(title ?? "TED notice").slice(0, 120),
          evidence_type: "procurement_award",
          evidence_url: `https://ted.europa.eu/en/notice/-/detail/${n.ND}`,
          evidence_date: n.PD ?? null,
          evidence_quote: `EU TED notice names ${vendor.domain} (completed evaluation — class 4 signal with legal provenance)`,
          status: "evaluator",
        },
        { onConflict: "vendor_id,org_name,evidence_url" }
      );
      if (!error) written++;
    }
    const held = nameOnly.length;
    return {
      found: written,
      ms: Date.now() - t0,
      note: written
        ? `${written} domain-anchored award notices`
        : held
        ? `0 domain-anchored · ${held} name-only matches HELD OUT pending entity resolution (common-word name)`
        : "no TED notices name this vendor (normal for SMB SaaS)",
    };
  } catch (e) {
    return { found: 0, ms: Date.now() - t0, note: `TED unreachable: ${String(e).slice(0, 60)}` };
  }
}

// --- GitHub: VERIFY-ONLY (AUP bars outreach use) — count code mentions ---
function githubLane(vendor) {
  const t0 = Date.now();
  try {
    const out = execFileSync(
      "gh",
      ["api", `search/code?q=${encodeURIComponent(`"${vendor.domain}" in:file`)}&per_page=1`],
      { timeout: 30000, encoding: "utf8" }
    );
    const total = JSON.parse(out)?.total_count ?? 0;
    return {
      found: 0, // verify-only: counts inform confidence, never produce contacts
      ms: Date.now() - t0,
      note: `${total} code mentions on GitHub — verification signal only (AUP bars outreach use)`,
    };
  } catch (e) {
    return { found: 0, ms: Date.now() - t0, note: `gh unavailable: ${String(e).slice(0, 50)}` };
  }
}

// --- Discourse community probe: does the vendor run a public forum? ---
async function discourseLane(vendor) {
  const t0 = Date.now();
  const hosts = [`community.${vendor.domain}`, `forum.${vendor.domain}`, `discuss.${vendor.domain}`];
  for (const h of hosts) {
    try {
      const res = await fetch(`https://${h}/about.json`, { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const about = await res.json();
        const users = about?.about?.stats?.users_count ?? "?";
        return {
          found: 0, // identify-only in communities; never solicit there
          ms: Date.now() - t0,
          note: `Discourse at ${h} (${users} users) — identify-only lane, never solicit in-forum`,
        };
      }
    } catch {
      /* try next host */
    }
  }
  return { found: 0, ms: Date.now() - t0, note: "no public community found for this vendor" };
}

for (const vendor of vendors ?? []) {
  console.log(`— ${vendor.name}`);
  const [ted, gh, disc] = [await tedLane(vendor), githubLane(vendor), await discourseLane(vendor)];
  await journal(vendor, "procurement", ted);
  await journal(vendor, "github", gh);
  await journal(vendor, "community", disc);
  console.log(`  ted: ${ted.note}\n  github: ${gh.note}\n  community: ${disc.note}`);
}
console.log("pre-seed complete");
