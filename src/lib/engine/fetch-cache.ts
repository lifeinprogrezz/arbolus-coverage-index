import { db } from "@/lib/db";
import type { CachedResponse } from "./types";

const TTL_HOURS = 24;
const MAX_BODY = 500_000; // cap stored bodies at ~500 KB

// Cached fetch through the response_cache table: repeat runs (replay mode,
// pre-mapped vendors) cost zero upstream requests and render instantly.
export async function cachedFetchText(
  url: string,
  init?: RequestInit & { timeoutMs?: number }
): Promise<CachedResponse> {
  const supa = db();
  const { data: hit } = await supa
    .from("response_cache")
    .select("body,status,fetched_at")
    .eq("url", url)
    .maybeSingle();

  if (hit && Date.now() - new Date(hit.fetched_at).getTime() < TTL_HOURS * 3600_000) {
    return { status: hit.status ?? 200, body: hit.body ?? "", fromCache: true };
  }

  let status = 0;
  let body = "";
  try {
    const res = await fetch(url, {
      ...init,
      headers: {
        "user-agent":
          "coverage-index-prototype/0.1 (research prototype; contact: hello@lifeinprogrezz.com)",
        ...(init?.headers ?? {}),
      },
      signal: AbortSignal.timeout(init?.timeoutMs ?? 20_000),
      redirect: "follow",
    });
    status = res.status;
    body = (await res.text()).slice(0, MAX_BODY);
  } catch (e) {
    status = 0;
    body = String(e);
  }

  // never cache failures — a transient timeout must not poison 24h of runs
  if (status > 0 && status < 500) {
    await supa.from("response_cache").upsert({
      url,
      body,
      status,
      fetched_at: new Date().toISOString(),
    });
  }
  return { status, body, fromCache: false };
}

export async function cachedFetchJson<T = unknown>(
  url: string,
  init?: RequestInit
): Promise<T | null> {
  const res = await cachedFetchText(url, init);
  if (res.status < 200 || res.status >= 300) return null;
  try {
    return JSON.parse(res.body) as T;
  } catch {
    return null;
  }
}
