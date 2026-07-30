import { cachedFetchText } from "./fetch-cache";
import type { CachedResponse } from "./types";

// Jina Reader: URL → clean markdown. Keyless mode ~20 rpm; with a free API
// key 100 rpm / 10M tokens. Runs fine inside Vercel functions (plain HTTPS),
// and Jina's IPs take the crawling exposure, not ours.
export async function jinaRead(url: string): Promise<CachedResponse> {
  const target = `https://r.jina.ai/${url}`;
  const key = process.env.JINA_API_KEY;
  return cachedFetchText(target, {
    headers: key ? { authorization: `Bearer ${key}` } : {},
  });
}

// rough Jina cost for the ticker: $0.02 / 1M output tokens ≈ free
export function jinaCost(bytes: number): number {
  return (bytes / 4) * 0.02e-6;
}
