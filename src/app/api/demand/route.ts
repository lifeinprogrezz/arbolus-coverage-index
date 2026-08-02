import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// The "request coverage" front door. Fires a SIMULATED demand event: the searched-and-empty signal
// that both orders the map queue AND authorises the burst budget.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }
  const supa = db();
  const { data: vendor } = await supa
    .from("vendors")
    .select("id, name")
    .eq("domain", body.domain)
    .maybeSingle();
  if (!vendor) return NextResponse.json({ error: "unknown vendor" }, { status: 404 });

  const { error } = await supa.from("demand_events").insert({
    vendor_id: vendor.id,
    event_type: "searched_empty",
    simulated: true,
    target: 20,
    clock_deadline: new Date(Date.now() + 30 * 86400e3).toISOString(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, vendor: vendor.name });
}
