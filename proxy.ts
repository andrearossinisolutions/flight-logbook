import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
} from "@/lib/auth";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/briefing",
]);
const PUBLIC_API_PREFIXES = [
  "/api/auth/login",
  "/api/register",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Normalize the pathname: convert to lowercase and remove trailing slash for comparison
  const normalizedPath = pathname.toLowerCase().replace(/\/$/, "") || "/";

  const isPublicPath =
    PUBLIC_PATHS.has(normalizedPath) ||
    PUBLIC_API_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));

  if (isPublicPath) {
    const response = NextResponse.next();

    if (session) {
      const refreshedToken = await createSession({
        userId: session.userId,
        email: session.email,
      });

      response.cookies.set(SESSION_COOKIE, refreshedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      });
    }

    return response;
  }

  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const refreshedToken = await createSession({
    userId: session.userId,
    email: session.email,
  });

  const response = NextResponse.next();
  response.cookies.set(SESSION_COOKIE, refreshedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};