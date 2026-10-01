import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildMapData } from "@/lib/map-data";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { token } = await params;

    const link = await prisma.mapShareLink.findUnique({ where: { token } });
    if (!link) {
      return NextResponse.json({ error: "Link non trovato" }, { status: 404 });
    }

    const passengerFilter = link.passengerFilter
      ? link.passengerFilter.split(",").map((p) => p.trim()).filter(Boolean)
      : null;

    const { points, routes } = await buildMapData(link.userId, {
      includeFuturePlans: link.includeFuturePlans,
      passengerFilter,
    });

    return NextResponse.json({ points, routes });
  } catch (err: any) {
    console.error("Errore nel refresh della mappa pubblica:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
