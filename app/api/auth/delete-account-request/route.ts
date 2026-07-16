import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendUserEmail } from "@/lib/mail";
import crypto from "crypto";

export async function POST() {
  const session = await getSessionFromCookie();
  if (!session) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
  }

  // Genera un token crittografico sicuro
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Scadenza 24 ore

  // Salva il token nel DB
  await prisma.user.update({
    where: { id: user.id },
    data: {
      deleteAccountToken: token,
      deleteAccountTokenExpiresAt: expiresAt,
    },
  });

  // Costruisci il link di conferma
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const confirmUrl = `${appUrl}/api/auth/confirm-delete-account?token=${token}`;

  // Componi l'email
  const subject = "Conferma eliminazione account - Flight Logbook";
  
  const text = `Ciao${user.fullName ? ` ${user.fullName}` : ""},\n\n` +
    `Abbiamo ricevuto una richiesta per eliminare definitivamente il tuo account Flight Logbook e tutti i dati associati.\n\n` +
    `ATTENZIONE: Questa operazione è irreversibile. Procedendo, tutti i tuoi inserimenti (voli, statistiche, impostazioni, partnership) verranno cancellati per sempre.\n\n` +
    `Se vuoi procedere con l'eliminazione definitiva del tuo account, clicca sul link seguente o copialo nel browser:\n` +
    `${confirmUrl}\n\n` +
    `Questo link scadrà tra 24 ore. Se non hai richiesto tu l'eliminazione dell'account, ignora questa email e il tuo account rimarrà attivo.\n\n` +
    `Buon volo,\nIl Team di Flight Logbook`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1f2937; background-color: #f9fafb;">
      <div style="margin: 0 0 24px; padding: 22px; border-radius: 24px; background: linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%); color: #ffffff;">
        <div style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.85; margin-bottom: 8px;">
          Sicurezza Account
        </div>
        <div style="font-size: 26px; line-height: 1.1; font-weight: 800; margin-bottom: 8px;">
          Richiesta Eliminazione Account ⚠️
        </div>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Ciao${user.fullName ? ` <strong>${user.fullName}</strong>` : ""},
      </p>
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Abbiamo ricevuto una richiesta per eliminare definitivamente il tuo profilo su <strong>Flight Logbook</strong> e tutti i tuoi dati.
      </p>
      
      <div style="margin: 24px 0; padding: 16px; border-radius: 12px; border: 1px solid #fee2e2; background-color: #fef2f2; color: #991b1b; font-size: 14px; line-height: 1.6;">
        <strong>ATTENZIONE:</strong> Questa operazione è **completamente irreversibile**. Cliccando sul link di conferma, tutti i tuoi voli inseriti, le statistiche, i promemoria, le impostazioni e le associazioni di società/noleggio verranno cancellati definitivamente senza possibilità di recupero.
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #374151;">
        Se sei sicuro di voler procedere, clicca sul pulsante sottostante entro 24 ore:
      </p>
      
      <div style="text-align: center; margin: 32px 0 24px;">
        <a href="${confirmUrl}" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 14px 32px; border-radius: 12px; font-weight: bold; text-decoration: none; font-size: 15px; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.2);">
          Conferma Eliminazione Definitiva
        </a>
      </div>
      
      <p style="font-size: 13px; color: #6b7280; text-align: center; margin-top: 24px;">
        Se non sei riuscito a cliccare sul pulsante, copia e incolla questo link nel browser:<br />
        <a href="${confirmUrl}" style="color: #dc2626; word-break: break-all;">${confirmUrl}</a>
      </p>
      
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="font-size: 13px; color: #6b7280; line-height: 1.5;">
        Se non hai richiesto tu l'eliminazione dell'account, puoi ignorare tranquillamente questa comunicazione. Il tuo account rimarrà attivo e protetto.
      </p>
    </div>
  `;

  try {
    await sendUserEmail({
      userId: user.id,
      subject,
      text,
      html,
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Errore nell'invio della mail di eliminazione account:", err);
    return NextResponse.json({ error: "Errore durante l'invio dell'email" }, { status: 500 });
  }
}
