// Seed the SYNTHETIC reservoir (labelled synthetic=true everywhere).
// The join logic is real; the 200k base is Arbolus's — we simulate a small
// slice whose employer domains overlap the indexed orgs so the org-level
// join demonstrably fires (the measured hit-ratio on the REAL base is the
// experiment's first falsifiable claim — 03-design §11).
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const supa = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false }, realtime: { transport: ws } }
);

const FIRST = ["Alex", "Sam", "Jordan", "Casey", "Robin", "Taylor", "Morgan", "Jamie", "Drew", "Charlie", "Elena", "Marco", "Ines", "Pau", "Nadia", "Tomas", "Lena", "Oscar", "Petra", "Hugo"];
const LAST = ["Keller", "Novak", "Ferrer", "Lindqvist", "Okafor", "Tanaka", "Weiss", "Moreau", "Silva", "Kowalski", "Berg", "Rossi", "Duarte", "Haas", "Vogel", "Nilsen", "Costa", "Meier", "Sato", "Klein"];
const TITLES = ["Finance Manager", "Head of Operations", "IT Manager", "Financial Controller", "VP Engineering", "Procurement Lead", "Revenue Operations Manager", "Head of IT", "CFO", "Engineering Manager"];
const STACKS = [
  ["Cledara", "Slack", "Notion"],
  ["Spendesk", "Xero", "Slack"],
  ["Ramp", "NetSuite"],
  ["Vertice", "Jira"],
  ["Notion", "Figma", "Linear"],
  ["Salesforce", "Gong"],
];
// deterministic pseudo-random (seeded) so reruns are stable
let s = 42;
const rnd = () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

// employer domains: pull the real indexed org domains + filler companies
const { data: orgs } = await supa
  .from("customer_orgs")
  .select("org_name, org_domain")
  .not("org_domain", "is", null);

const FILLER_DOMAINS = ["acme-logistics.eu", "nordwind.io", "bluefin-labs.com", "helios-health.de", "cactus-crm.es", "moss-fintech.com", "windmill-hr.nl", "atlas-devtools.io"];

const rows = [];
// 2–4 experts at a subset of REAL indexed orgs (so the join fires visibly)
for (const org of orgs ?? []) {
  if (rnd() < 0.4) continue; // some orgs have no experts — honest variance
  const n = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) {
    rows.push({
      full_name: `${pick(FIRST)} ${pick(LAST)}`,
      title: pick(TITLES),
      employer: org.org_name,
      employer_domain: org.org_domain,
      declared_stack: pick(STACKS),
      last_engagement: new Date(Date.now() - rnd() * 540 * 86400e3).toISOString().slice(0, 10),
      dormant: rnd() < 0.3,
      synthetic: true,
    });
  }
}
// filler population so the base isn't only convenient hits
for (let i = 0; i < 120; i++) {
  const dom = pick(FILLER_DOMAINS);
  rows.push({
    full_name: `${pick(FIRST)} ${pick(LAST)}`,
    title: pick(TITLES),
    employer: dom.split(".")[0],
    employer_domain: dom,
    declared_stack: pick(STACKS),
    last_engagement: new Date(Date.now() - rnd() * 720 * 86400e3).toISOString().slice(0, 10),
    dormant: rnd() < 0.4,
    synthetic: true,
  });
}

await supa.from("reservoir_experts").delete().eq("synthetic", true);
const { error } = await supa.from("reservoir_experts").insert(rows);
console.log(error ? `seed ERROR: ${error.message}` : `seeded ${rows.length} synthetic experts (${(orgs ?? []).length} real org domains in play)`);
