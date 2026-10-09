import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const user = await requireUser();

    const settings = await prisma.settings.findUnique({ where: { userId: user.id } });
    if (!settings) {
      return NextResponse.json({ error: "Impostazioni non trovate" }, { status: 400 });
    }

    // Il token viene riusato, così lo stesso link resta valido nel tempo
    const token = settings.weatherShareToken ?? randomBytes(24).toString("base64url");
    if (!settings.weatherShareToken) {
      await prisma.settings.update({
        where: { userId: user.id },
        data: { weatherShareToken: token },
      });
    }

    return NextResponse.json({ success: true, token });
  } catch (err: any) {
    console.error("Errore nella creazione del link di condivisione meteo weekend:", err);
    return NextResponse.json({ error: err.message || "Errore interno del server" }, { status: 500 });
  }
}
