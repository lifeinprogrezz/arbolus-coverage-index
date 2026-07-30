import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { password, from } = await req.json().catch(() => ({}));
  if (!process.env.GATE_PASSWORD || password !== process.env.GATE_PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true, to: from || "/" });
  res.cookies.set("ci_gate", password, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}
