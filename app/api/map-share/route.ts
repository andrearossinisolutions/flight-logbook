import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireUser();

    const link = await prisma.mapShareLink.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    if (!link) {
      return NextResponse.json({ link: null });
    }

    return NextResponse.json({
      link: {
        token: link.token,
        includeFuturePlans: link.includeFuturePlans,
        passengers: link.passengerFilter ? link.passengerFilter.split(",").filter(Boolean) : [],
      },
    });
  } catch (err: any) {
    console.error("Errore nel recupero del link di condivisione mappa:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = await req.json();

    const includeFuturePlans = body?.includeFuturePlans === true;
    const passengers: string[] = Array.isArray(body?.passengers)
      ? body.passengers.map((p: unknown) => String(p).trim()).filter(Boolean)
      : [];
    const passengerFilter = passengers.length > 0 ? passengers.join(",") : null;

    // Riusa il link più recente dell'utente (se esiste) aggiornandone i filtri, così lo stesso
    // URL resta valido anche cambiando opzioni. Non è un vincolo DB: in futuro si potranno
    // avere più link per utente.
    const existing = await prisma.mapShareLink.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    const link = existing
      ? await prisma.mapShareLink.update({
          where: { id: existing.id },
          data: { includeFuturePlans, passengerFilter },
        })
      : await prisma.mapShareLink.create({
          data: {
            userId: user.id,
            token: randomBytes(24).toString("base64url"),
            includeFuturePlans,
            passengerFilter,
          },
        });

    return NextResponse.json({ success: true, token: link.token });
  } catch (err: any) {
    console.error("Errore nella creazione del link di condivisione mappa:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
