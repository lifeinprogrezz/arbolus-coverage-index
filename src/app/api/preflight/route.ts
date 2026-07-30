import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Pre-flight egress test (build checklist item 5): verify that the lanes'
// key upstreams answer from a deployed Vercel function's egress IP.
// - ATS public JSON (Greenhouse boards API)
// - Jina Reader keyless fetch
// - Wayback CDX
async function probe(name: string, url: string, init?: RequestInit) {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
    const body = await res.text();
    return {
      name,
      status: res.status,
      ok: res.ok,
      bytes: body.length,
      ms: Date.now() - t0,
    };
  } catch (e) {
    return { name, status: 0, ok: false, error: String(e), ms: Date.now() - t0 };
  }
}

export async function GET() {
  const results = await Promise.all([
    probe("greenhouse-ats", "https://boards-api.greenhouse.io/v1/boards/stripe/jobs"),
    probe("jina-reader-keyless", "https://r.jina.ai/https://arbolus.com/arbolus-customer-library"),
    probe("wayback-cdx", "https://web.archive.org/cdx/search/cdx?url=arbolus.com&output=json&limit=2"),
    probe("hn-algolia", "https://hn.algolia.com/api/v1/search?query=arbolus&hitsPerPage=1"),
  ]);
  return NextResponse.json({
    egress: "vercel-function",
    at: new Date().toISOString(),
    results,
  });
}
