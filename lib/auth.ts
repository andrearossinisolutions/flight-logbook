import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "flightlog_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 giorni
const SESSION_EXPIRATION = "7d";
// Il proxy rinnova il cookie solo quando manca meno di metà della durata (3,5 giorni)
export const SESSION_RENEW_THRESHOLD_SECONDS = SESSION_MAX_AGE / 2;

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is missing");
  }
  return new TextEncoder().encode(secret);
}

export type SessionPayload = {
  userId: string;
  email: string;
  // Claim standard del JWT (secondi): presenti nei token verificati, non nel payload di createSession
  exp?: number;
  iat?: number;
};

// True se la sessione è vicina alla scadenza (o non ha exp) e va rinnovata
export function shouldRenewSession(
  session: SessionPayload,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  if (typeof session.exp !== "number") return true;
  return session.exp - nowSeconds < SESSION_RENEW_THRESHOLD_SECONDS;
}

// Attributi del cookie di sessione, condivisi da login/registrazione e proxy
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function createSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(SESSION_EXPIRATION)
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, getSecret());
    const payload = verified.payload as SessionPayload;

    if (!payload.userId || !payload.email) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionFromCookie(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  return verifySessionToken(token);
}