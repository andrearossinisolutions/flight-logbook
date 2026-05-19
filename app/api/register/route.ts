import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, setSessionCookie } from "@/lib/auth";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const json = await request.json();
  const parsed = registerSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Dati non validi" }, { status: 400 });
  }

  const { email, password, fullName } = parsed.data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json({ error: "Esiste già un account con questa email." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      fullName: fullName || null,
      passwordHash,
      settings: {
        create: {
          rentalRatePerHour: 150,
          instructorRatePerHour: 80,
          currency: "EUR",
        },
      },
    },
  });

  // Verifica se ci sono inviti pendenti per questa email
  const invitations = await prisma.partnershipInvitation.findMany({
    where: { email: email.trim().toLowerCase() }
  });

  if (invitations.length > 0) {
    for (const invite of invitations) {
      // Verifichiamo prima che non sia già stato aggiunto (per sicurezza)
      const existingMember = await prisma.partnershipMember.findUnique({
        where: {
          partnershipId_userId: {
            partnershipId: invite.partnershipId,
            userId: user.id
          }
        }
      });
      if (!existingMember) {
        await prisma.partnershipMember.create({
          data: {
            partnershipId: invite.partnershipId,
            userId: user.id,
            role: invite.role
          }
        });
      }
    }

    await prisma.partnershipInvitation.deleteMany({
      where: { email: email.trim().toLowerCase() }
    });
  }

  const token = await createSession({ userId: user.id, email: user.email });
  await setSessionCookie(token);

  return NextResponse.json({ ok: true });
}
