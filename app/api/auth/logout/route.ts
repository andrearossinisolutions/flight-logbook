import { NextResponse, NextRequest } from "next/server";
import { clearSessionCookie } from "@/lib/auth";

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(request: NextRequest) {
  await clearSessionCookie();
  const { searchParams } = new URL(request.url);
  const redirectTo = searchParams.get("redirect") || "/login";
  return NextResponse.redirect(new URL(redirectTo, request.url));
}
