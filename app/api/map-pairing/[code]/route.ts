import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

interface RouteParams {
  params: Promise<{ code: string }>;
}

// Usata dalla pagina TV (/public-map) in polling: ritorna il token del link mappa una volta
// che il telefono che ha scansionato il QR ha effettuato il login e lo ha associato a questo codice.
export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { code } = await params;

    const pairing = await prisma.mapPairing.findUnique({ where: { code } });
    if (!pairing || pairing.expiresAt < new Date()) {
      return NextResponse.json({ token: null, expired: true });
    }

    return NextResponse.json({ token: pairing.token, expired: false });
  } catch (err: any) {
    console.error("Errore nel polling del pairing mappa:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}

// Chiamata dal telefono (autenticato) dopo il login, per associare il proprio link mappa più
// recente al codice di pairing mostrato sulla TV.
export async function POST(_req: Request, { params }: RouteParams) {
  try {
    const user = await requireUser();
    const { code } = await params;

    const pairing = await prisma.mapPairing.findUnique({ where: { code } });
    if (!pairing || pairing.expiresAt < new Date()) {
      return NextResponse.json({ error: "Codice di pairing non valido o scaduto" }, { status: 410 });
    }

    const link = await prisma.mapShareLink.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    if (!link) {
      return NextResponse.json({ error: "Nessun link mappa trovato per l'utente" }, { status: 404 });
    }

    await prisma.mapPairing.update({
      where: { code },
      data: { token: link.token },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Errore nell'associazione del pairing mappa:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
