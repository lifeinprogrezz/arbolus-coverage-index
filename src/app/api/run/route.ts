import { NextRequest } from "next/server";
import { ensureVendor, mapRun, type RunEvent } from "@/lib/engine/map-run";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // Fluid compute — a live map run takes minutes

// SSE stream: the map-run view consumes this. Each event is one JSON line.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const domain = searchParams.get("domain");
  const name = searchParams.get("name") ?? domain ?? "";
  if (!domain) {
    return new Response(JSON.stringify({ error: "domain required" }), {
      status: 400,
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (e: RunEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      try {
        const vendor = await ensureVendor(name, domain);
        await mapRun(vendor, send);
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "run_error", error: String(err) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
    },
  });
}
