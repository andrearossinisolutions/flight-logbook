import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseRomeDateTime } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const aircraftId = searchParams.get("aircraftId");
  const startRaw = searchParams.get("start");
  const endRaw = searchParams.get("end");
  const excludeBookingId = searchParams.get("excludeBookingId");

  if (!aircraftId || !startRaw || !endRaw) {
    return NextResponse.json({ error: "Parametri mancanti" }, { status: 400 });
  }

  const start = parseRomeDateTime(startRaw);
  const end = parseRomeDateTime(endRaw);

  if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return NextResponse.json({ overlapping: null });
  }

  const overlapping = await prisma.partnershipBooking.findFirst({
    where: {
      aircraftId,
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      startTime: { lt: end },
      endTime: { gt: start },
    },
    include: {
      user: true,
    },
  });

  if (!overlapping) {
    return NextResponse.json({ overlapping: null });
  }

  return NextResponse.json({
    overlapping: {
      startTime: overlapping.startTime.toISOString(),
      endTime: overlapping.endTime.toISOString(),
      notes: overlapping.notes,
      userName: overlapping.user.fullName || overlapping.user.email,
    },
  });
}
