import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createRequire } from "module";

let client: SupabaseClient | null = null;

// Node 20 has no native WebSocket; supabase-js's realtime client needs one
// even though we never subscribe. Vercel runs Node 22 (native), local dev
// runs 20 — feed it `ws` only when the global is missing.
function realtimeTransport(): { transport?: unknown } {
  if (typeof globalThis.WebSocket !== "undefined") return {};
  try {
    const req = createRequire(import.meta.url);
    return { transport: req("ws") };
  } catch {
    return {};
  }
}

// Server-only client. RLS is deny-all; every read/write goes through the
// service role — the browser never touches Supabase directly.
export function db(): SupabaseClient {
  if (client) return client;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  client = createClient(url, key, {
    auth: { persistSession: false },
    realtime: realtimeTransport() as never,
  });
  return client;
}
