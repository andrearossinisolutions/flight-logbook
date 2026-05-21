import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/mail";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = forgotPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: "Email non valida" }, { status: 400 });
    }

    const { email } = parsed.data;

    // Cerca l'utente
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Restituiamo comunque un messaggio di successo generico per sicurezza (evita email enumeration)
      return NextResponse.json({ ok: true, message: "Se l'indirizzo email è registrato, riceverai un link di ripristino." });
    }

    // Genera token di reset e scadenza (1 ora)
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600000); // 1 ora

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpiresAt: expiresAt,
      },
    });

    // Costruisci il link di ripristino
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    console.log(`[PASSWORD RESET] Token per ${email}: ${token}`);
    console.log(`[PASSWORD RESET] Link: ${resetUrl}`);

    try {
      await sendEmail({
        to: email,
        subject: "Ripristino Password - Flight Logbook",
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Ripristino Password</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
              Hai richiesto di ripristinare la password per il tuo account su Flight Logbook.
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
              Clicca sul pulsante sottostante per impostare una nuova password. Questo link scadrà tra 1 ora.
            </p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Ripristina Password
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              Se non hai richiesto tu il ripristino, puoi ignorare questa email in tutta sicurezza. La tua password rimarrà invariata.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              Questo è un messaggio automatico da Flight Logbook.
            </p>
          </div>
        `,
        text: `Hai richiesto di ripristinare la password per il tuo account su Flight Logbook.\n\nClicca sul link seguente per impostare una nuova password (valido per 1 ora):\n${resetUrl}`
      });
    } catch (emailError) {
      console.error("Errore durante l'invio dell'email di ripristino password:", emailError);
    }

    return NextResponse.json({ ok: true, message: "Se l'indirizzo email è registrato, riceverai un link di ripristino." });
  } catch (error) {
    console.error("Errore forgot-password API:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
