// Env sanity check — prints presence booleans + a live Supabase ping.
// Never prints values.
import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const names = [
  "SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_ANON_KEY",
  "ANTHROPIC_API_KEY",
  "SERPER_API_KEY",
  "JINA_API_KEY",
];
for (const n of names) {
  console.log(`${n}: ${process.env[n] ? "present" : "MISSING"}`);
}

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
if (url && key) {
  const supa = createClient(url, key, {
    auth: { persistSession: false },
    realtime: { transport: ws },
  });
  const { count, error } = await supa
    .from("vendors")
    .select("*", { count: "exact", head: true });
  console.log(error ? `supabase ping: ERROR ${error.message}` : `supabase ping: OK (vendors=${count})`);
} else {
  console.log("supabase ping: skipped (missing url or service key)");
}
