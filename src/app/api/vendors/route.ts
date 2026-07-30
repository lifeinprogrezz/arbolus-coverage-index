import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Coverage board data: vendors + book state + latest journal.
export async function GET() {
  const supa = db();
  const { data: vendors, error } = await supa
    .from("vendors")
    .select("*")
    .order("demand_score", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendors: vendors ?? [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.domain) {
    return NextResponse.json({ error: "domain required" }, { status: 400 });
  }
  const supa = db();
  const clean = String(body.domain)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  const { data, error } = await supa
    .from("vendors")
    .upsert(
      {
        name: body.name ?? clean.split(".")[0],
        domain: clean,
        category: body.category ?? null,
        hq_country: body.hq_country ?? null,
        exclusion_domains: [clean],
      },
      { onConflict: "domain" }
    )
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ vendor: data });
}
