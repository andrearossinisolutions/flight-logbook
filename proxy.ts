import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE, SESSION_MAX_AGE, verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return NextResponse.next();
  }

  const session = await verifySessionToken(token);

  if (!session) {
    const response = NextResponse.next();
    response.cookies.set(SESSION_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      expires: new Date(0),
    });
    return response;
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
  matcher: [
    "/",
    "/dashboard/:path*",
    "/new-flight/:path*",
    "/new-topup/:path*",
    "/movements/:path*",
    "/settings/:path*",
    "/login",
    "/register",
  ],
};