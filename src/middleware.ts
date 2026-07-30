import { NextRequest, NextResponse } from "next/server";

// Light access gate: active ONLY when GATE_PASSWORD is set (armed at
// freeze, before the Monday send). A politeness gate for an unlisted,
// noindexed URL — not a security boundary, and it doesn't pretend to be.
export function middleware(req: NextRequest) {
  const password = process.env.GATE_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/gate") || pathname.startsWith("/api/gate")) {
    return NextResponse.next();
  }

  const cookie = req.cookies.get("ci_gate")?.value;
  if (cookie === password) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
