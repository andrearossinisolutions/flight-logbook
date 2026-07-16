import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return new Response("Token mancante o non valido.", { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: {
      deleteAccountToken: token,
      deleteAccountTokenExpiresAt: {
        gt: new Date(),
      },
    },
  });

  if (!user) {
    return new Response("Il link di eliminazione è scaduto, non valido o già utilizzato.", { status: 400 });
  }

  try {
    // Cancella l'utente (cancella a cascata tutti i suoi dati)
    await prisma.user.delete({
      where: { id: user.id },
    });

    console.log(`[auth] Account utente ${user.email} eliminato definitivamente con successo.`);

    // Elimina il cookie di sessione
    const cookieStore = await cookies();
    cookieStore.delete("session");

    const appUrl = process.env.APP_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appUrl}/?account_deleted=true`);
  } catch (err) {
    console.error("Errore durante l'eliminazione dell'account:", err);
    return new Response("Si è verificato un errore del server durante la cancellazione.", { status: 500 });
  }
}
