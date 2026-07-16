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
    // Gestione pulizia società (Partnership) partecipate dall'utente prima dell'eliminazione
    const memberships = await prisma.partnershipMember.findMany({
      where: { userId: user.id },
    });

    for (const membership of memberships) {
      // Conta quanti membri totali ci sono nella società
      const memberCount = await prisma.partnershipMember.count({
        where: { partnershipId: membership.partnershipId },
      });

      if (memberCount <= 1) {
        // Se c'è solo questo utente (società monoutente), eliminiamo l'intera società e le sue dipendenze
        await prisma.partnership.delete({
          where: { id: membership.partnershipId },
        });
        console.log(`[auth] Società ${membership.partnershipId} eliminata perché l'utente era l'unico membro.`);
      } else {
        // Se ci sono altri soci, l'utente viene rimosso (tramite cascade sulla sua cancellazione).
        // Se l'utente era ADMIN, dobbiamo assicurarci che la società non rimanga senza amministratori.
        if (membership.role === "ADMIN") {
          const otherAdminCount = await prisma.partnershipMember.count({
            where: {
              partnershipId: membership.partnershipId,
              role: "ADMIN",
              NOT: { userId: user.id },
            },
          });

          if (otherAdminCount === 0) {
            // Promuoviamo ad ADMIN il membro più anziano tra i rimanenti
            const nextMember = await prisma.partnershipMember.findFirst({
              where: {
                partnershipId: membership.partnershipId,
                NOT: { userId: user.id },
              },
              orderBy: { createdAt: "asc" },
            });

            if (nextMember) {
              await prisma.partnershipMember.update({
                where: { id: nextMember.id },
                data: { role: "ADMIN" },
              });
              console.log(`[auth] Utente ${nextMember.userId} promosso ad ADMIN nella società ${membership.partnershipId} in sostituzione dell'utente uscente.`);
            }
          }
        }
      }
    }

    // Cancella l'utente (cancella a cascata tutti i suoi dati personali)
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
