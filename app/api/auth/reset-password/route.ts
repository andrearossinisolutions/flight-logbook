import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "La password deve essere lunga almeno 8 caratteri").max(100),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = resetPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
    }

    const { token, password } = parsed.data;

    // Cerca l'utente con il token fornito
    const user = await prisma.user.findUnique({
      where: { resetToken: token },
    });

    if (!user || !user.resetTokenExpiresAt) {
      return NextResponse.json({ error: "Token non valido o già utilizzato." }, { status: 400 });
    }

    // Verifica se il token è scaduto
    const isExpired = user.resetTokenExpiresAt < new Date();
    if (isExpired) {
      // Puliamo il token scaduto per sicurezza
      await prisma.user.update({
        where: { id: user.id },
        data: {
          resetToken: null,
          resetTokenExpiresAt: null,
        },
      });
      return NextResponse.json({ error: "Il link di ripristino è scaduto." }, { status: 400 });
    }

    // Cripta la nuova password
    const passwordHash = await bcrypt.hash(password, 10);

    // Aggiorna l'utente rimuovendo il token di reset (quindi non sarà più utilizzabile)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    return NextResponse.json({ ok: true, message: "Password ripristinata con successo." });
  } catch (error) {
    console.error("Errore reset-password API:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
