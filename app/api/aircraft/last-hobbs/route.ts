import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const registration = searchParams.get("registration");

  if (!registration) {
    return NextResponse.json({ error: "Registration is required" }, { status: 400 });
  }

  const lastFlight = await prisma.flight.findFirst({
    where: {
      aircraftRegistration: registration.toUpperCase(),
      movement: {
        isDraft: false,
      },
    },
    orderBy: {
      movement: {
        date: "desc",
      },
    },
    select: {
      id: true,
      inputMode: true,
      hobbsEndMinutes: true,
    },
  });

  if (!lastFlight) {
    return NextResponse.json({ lastFlight: null });
  }

  return NextResponse.json({
    lastFlight: {
      id: lastFlight.id,
      inputMode: lastFlight.inputMode,
      hobbsEndMinutes: lastFlight.hobbsEndMinutes,
    },
  });
}
