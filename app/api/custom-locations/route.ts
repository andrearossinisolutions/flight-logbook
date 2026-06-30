import { NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { getCoordinatesFromName } from "@/lib/weather";

const COORDS_REGEX = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/;

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const { name, address } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nome località richiesto" }, { status: 400 });
    }

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Indirizzo o coordinate richiesti" }, { status: 400 });
    }

    const cleanName = name.trim().toUpperCase();
    let lat: number | null = null;
    let lon: number | null = null;

    // 1. Controlla se l'input corrisponde a coordinate dirette: "lat, lon"
    const match = address.match(COORDS_REGEX);
    if (match) {
      lat = parseFloat(match[1]);
      lon = parseFloat(match[2]);
    } else {
      // 2. Altrimenti, prova a geocodificare l'indirizzo
      const geo = await getCoordinatesFromName(address);
      if (geo) {
        lat = geo.lat;
        lon = geo.lon;
      }
    }

    if (lat === null || lon === null || isNaN(lat) || isNaN(lon)) {
      return NextResponse.json(
        { error: "Impossibile trovare la posizione per l'indirizzo inserito" },
        { status: 400 }
      );
    }

    // Salva o aggiorna l'override della posizione nel database
    const customLoc = await prisma.customLocation.upsert({
      where: {
        userId_name: {
          userId: user.id,
          name: cleanName,
        },
      },
      update: {
        lat,
        lon,
        address,
      },
      create: {
        userId: user.id,
        name: cleanName,
        lat,
        lon,
        address,
      },
    });

    return NextResponse.json({ success: true, customLoc });
  } catch (err: any) {
    console.error("Errore nel salvataggio della posizione custom:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireUser();
    const { name } = await req.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Nome località richiesto" }, { status: 400 });
    }

    const cleanName = name.trim().toUpperCase();

    // Rimuovi l'override della posizione dal database
    await prisma.customLocation.delete({
      where: {
        userId_name: {
          userId: user.id,
          name: cleanName,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    // Se non esiste, ritorniamo comunque successo
    if (err.code === "P2025") {
      return NextResponse.json({ success: true });
    }
    console.error("Errore nella rimozione della posizione custom:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
