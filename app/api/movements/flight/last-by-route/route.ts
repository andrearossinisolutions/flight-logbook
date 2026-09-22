import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function normalizePlace(value: string | null | undefined) {
  return (value ?? "").trim().toUpperCase();
}

function normalizeIntermediatePlaces(value: string | null | undefined) {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .join(",");
}

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const takeoffPlace = normalizePlace(searchParams.get("takeoffPlace"));
  const arrivalPlace = normalizePlace(searchParams.get("arrivalPlace"));
  const intermediatePlaces = normalizeIntermediatePlaces(
    searchParams.get("intermediatePlaces")
  );

  if (!takeoffPlace || !arrivalPlace) {
    return NextResponse.json({ lastFlight: null });
  }

  const candidates = await prisma.flight.findMany({
    where: {
      movement: {
        userId: session.userId,
        isDraft: false,
      },
      takeoffPlace: { not: null },
      arrivalPlace: { not: null },
    },
    orderBy: {
      movement: {
        date: "desc",
      },
    },
    select: {
      id: true,
      durationMinutes: true,
      takeoffPlace: true,
      arrivalPlace: true,
      intermediatePlaces: true,
      movement: { select: { date: true } },
    },
    take: 200,
  });

  const match = candidates.find(
    (c) =>
      normalizePlace(c.takeoffPlace) === takeoffPlace &&
      normalizePlace(c.arrivalPlace) === arrivalPlace &&
      normalizeIntermediatePlaces(c.intermediatePlaces) === intermediatePlaces
  );

  if (!match) {
    return NextResponse.json({ lastFlight: null });
  }

  return NextResponse.json({
    lastFlight: {
      id: match.id,
      durationMinutes: match.durationMinutes,
      date: match.movement.date,
    },
  });
}
