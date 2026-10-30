import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  shouldRenewSession,
  verifySessionToken,
  type SessionPayload,
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
  "/public-map",
  "/api/public-map",
  "/embed",
];

// Rinnova il cookie solo in finestra di rinnovo, così non c'è un Set-Cookie a ogni richiesta
// (Next lo tratterebbe come cookie modificato dalla server action e rileggerebbe la pagina).
async function renewSessionCookie(
  request: NextRequest,
  response: NextResponse,
  session: SessionPayload,
) {
  // Il logout cancella il cookie: il proxy non deve poterlo sovrascrivere
  if (request.nextUrl.pathname.toLowerCase().replace(/\/$/, "") === "/api/auth/logout") return;
  // L'header next-action è un dettaglio interno di Next: se cambiasse, resta valida la sola soglia
  if (request.headers.has("next-action")) return;
  if (!shouldRenewSession(session)) return;

  const refreshedToken = await createSession({
    userId: session.userId,
    email: session.email,
  });
  response.cookies.set(SESSION_COOKIE, refreshedToken, sessionCookieOptions());
}

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

  // Il polling della TV sul pairing è pubblico (solo GET); l'associazione (POST) richiede login.
  const isPublicPairingPoll =
    request.method === "GET" && normalizedPath.startsWith("/api/map-pairing/");

  const isPublicPath =
    PUBLIC_PATHS.has(normalizedPath) ||
    isPublicPairingPoll ||
    PUBLIC_API_PREFIXES.some((prefix) => normalizedPath.startsWith(prefix));

  if (isPublicPath) {
    const response = NextResponse.next();

    if (session) {
      await renewSessionCookie(request, response, session);
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

  const response = NextResponse.next();
  await renewSessionCookie(request, response, session);

  return response;
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};