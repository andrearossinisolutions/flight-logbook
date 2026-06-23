import { NextRequest } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  const session = await getSessionFromCookie();
  if (!session) {
    return new Response("Non autorizzato", { status: 401 });
  }

  const doc = await prisma.partnershipAircraftDocument.findUnique({
    where: { id },
    include: {
      aircraft: {
        select: {
          partnershipId: true,
        },
      },
    },
  });

  if (!doc) {
    return new Response("Documento non trovato", { status: 404 });
  }

  // Verifica che l'utente appartenga alla società proprietaria dell'aereo
  const membership = await prisma.partnershipMember.findUnique({
    where: {
      partnershipId_userId: {
        partnershipId: doc.aircraft.partnershipId,
        userId: session.userId,
      },
    },
  });

  if (!membership) {
    return new Response("Accesso negato", { status: 403 });
  }

  // Costruisci il nome del file pulito per Content-Disposition
  const safeFilename = doc.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const encodedFilename = encodeURIComponent(doc.name);

  return new Response(doc.content, {
    headers: {
      "Content-Type": doc.contentType,
      "Content-Length": doc.size.toString(),
      "Content-Disposition": `inline; filename="${safeFilename}"; filename*=UTF-8''${encodedFilename}`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
