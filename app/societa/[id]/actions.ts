"use server";

import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { sendEmail } from "@/lib/mail";

export async function addAircraft(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const registration = String(formData.get("registration") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const hourlyFuelCost = Number(formData.get("hourlyFuelCost") || 0);
  const hourlyMaintCost = Number(formData.get("hourlyMaintCost") || 0);
  const hourlyEngineFund = Number(formData.get("hourlyEngineFund") || 0);

  if (!registration || !type) return;

  // check permissions
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipAircraft.create({
    data: {
      partnershipId,
      registration,
      type,
      hourlyFuelCost,
      hourlyMaintCost,
      hourlyEngineFund,
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function addFixedCost(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const period = String(formData.get("period") || "MONTHLY").trim();

  if (!description || amount <= 0) return;

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipFixedCost.create({
    data: {
      partnershipId,
      description,
      amount,
      period,
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function addMember(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const email = String(formData.get("email") || "").trim();

  if (!email) return;

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  const userToAdd = await prisma.user.findUnique({ where: { email } });
  if (!userToAdd) {
    // L'utente non esiste: procediamo con l'invito.
    const existingInvitation = await prisma.partnershipInvitation.findUnique({
      where: {
        partnershipId_email: {
          partnershipId,
          email: email.toLowerCase()
        }
      }
    });

    if (existingInvitation) {
      throw new Error("Un invito per questa email è già in attesa.");
    }

    // Creiamo l'invito nel database
    await prisma.partnershipInvitation.create({
      data: {
        partnershipId,
        email: email.toLowerCase(),
        role: "MEMBER"
      }
    });

    // Recuperiamo il nome della società per l'email
    const partnership = await prisma.partnership.findUnique({
      where: { id: partnershipId }
    });

    const societyName = partnership?.name || "Società di volo";

    // Prepariamo l'email
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const registerUrl = `${appUrl}/register?email=${encodeURIComponent(email)}`;

    try {
      await sendEmail({
        to: email,
        subject: `Invito a far parte di ${societyName} su Flight Logbook`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #0f172a; margin-top: 0;">Sei stato invitato!</h2>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
              L'amministratore della società di volo <strong>${societyName}</strong> ti ha invitato a far parte del gruppo su Flight Logbook.
            </p>
            <p style="color: #334155; font-size: 16px; line-height: 1.5;">
              Con Flight Logbook potrai registrare i tuoi voli, consultare il rendiconto mensile dei costi fissi e orari, e gestire la cassa comune.
            </p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${registerUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                Crea il tuo Account
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 1.5;">
              <strong>Nota importante:</strong> Assicurati di registrarti utilizzando questa stessa email: <strong>${email}</strong>.<br />
              Una volta completata la registrazione, verrai automaticamente associato alla società.
            </p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin: 0;">
              Questo è un messaggio automatico da Flight Logbook. Se ritieni sia un errore, puoi ignorare questa email.
            </p>
          </div>
        `,
        text: `Sei stato invitato a far parte della società di volo ${societyName} su Flight Logbook.\n\nPer partecipare, crea il tuo account usando questa email (${email}) al quale puoi registrarti qui: ${registerUrl}`
      });
    } catch (mailError) {
      console.error("Errore durante l'invio dell'email di invito:", mailError);
    }
  } else {
    // L'utente esiste già: lo associamo direttamente
    const existingMember = await prisma.partnershipMember.findUnique({
      where: {
        partnershipId_userId: {
          partnershipId,
          userId: userToAdd.id
        }
      }
    });

    if (existingMember) {
      throw new Error("L'utente fa già parte di questa società.");
    }

    await prisma.partnershipMember.create({
      data: {
        partnershipId,
        userId: userToAdd.id,
        role: "MEMBER"
      }
    });
  }

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteAircraft(partnershipId: string, aircraftId: string) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipAircraft.deleteMany({
    where: { id: aircraftId, partnershipId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteFixedCost(partnershipId: string, costId: string) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipFixedCost.deleteMany({
    where: { id: costId, partnershipId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function updateAircraft(partnershipId: string, aircraftId: string, formData: FormData) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  const registration = String(formData.get("registration") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const hourlyFuelCost = Number(formData.get("hourlyFuelCost") || 0);
  const hourlyMaintCost = Number(formData.get("hourlyMaintCost") || 0);
  const hourlyEngineFund = Number(formData.get("hourlyEngineFund") || 0);

  if (!registration || !type) return;

  await prisma.partnershipAircraft.updateMany({
    where: { id: aircraftId, partnershipId },
    data: {
      registration,
      type,
      hourlyFuelCost,
      hourlyMaintCost,
      hourlyEngineFund,
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function updateFixedCost(partnershipId: string, costId: string, formData: FormData) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const period = String(formData.get("period") || "MONTHLY").trim();

  if (!description || amount <= 0) return;

  await prisma.partnershipFixedCost.updateMany({
    where: { id: costId, partnershipId },
    data: {
      description,
      amount,
      period,
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function removeMember(partnershipId: string, memberUserId: string) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;
  if (user.id === memberUserId) throw new Error("Non puoi rimuovere te stesso");

  await prisma.partnershipMember.deleteMany({
    where: { partnershipId, userId: memberUserId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function getMonthlyReport(partnershipId: string, year: number, month: number) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (!membership) {
    throw new Error("Non hai accesso a questa società");
  }

  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    include: {
      members: { include: { user: true } },
      fixedCosts: true,
      aircrafts: true,
    }
  });

  if (!partnership) throw new Error("Società non trovata");

  const startOfMonth = new Date(year, month, 1);
  const endOfMonth = new Date(year, month + 1, 1);

  const fixedCostTotal = partnership.fixedCosts.reduce((acc, c) => acc + (c.period === 'YEARLY' ? Number(c.amount) / 12 : Number(c.amount)), 0);
  const fixedCostPerMember = partnership.members.length > 0 ? fixedCostTotal / partnership.members.length : 0;

  const aircraftIds = partnership.aircrafts.map(a => a.id);

  const movements = await prisma.movement.findMany({
    where: {
      type: "FLIGHT",
      date: {
        gte: startOfMonth,
        lt: endOfMonth,
      },
      flight: {
        partnershipAircraftId: { in: aircraftIds }
      }
    },
    include: {
      flight: {
        include: { partnershipAircraft: true }
      },
      user: true,
    }
  });

  const memberExpenses = await prisma.partnershipTransaction.findMany({
    where: {
      partnershipId,
      type: "MEMBER_EXPENSE",
      date: {
        gte: startOfMonth,
        lt: endOfMonth,
      }
    }
  });

  const memberReports = partnership.members.map(m => {
    const userMovements = movements.filter(mov => mov.userId === m.userId);
    let flightCost = 0;
    let durationMinutes = 0;

    for (const mov of userMovements) {
      const f = mov.flight;
      const pa = f?.partnershipAircraft;
      if (!f || !pa) continue;
      durationMinutes += f.durationMinutes;

      const hourlyCost = Number(pa.hourlyFuelCost) + Number(pa.hourlyMaintCost) + Number(pa.hourlyEngineFund);
      flightCost += (f.durationMinutes / 60) * hourlyCost;
    }

    const userExpenses = memberExpenses.filter(t => t.userId === m.userId);
    const advancedExpense = userExpenses.reduce((acc, t) => acc + Number(t.amount), 0);

    return {
      userId: m.userId,
      fullName: m.user.fullName || m.user.email,
      fixedCost: fixedCostPerMember,
      flightCost,
      advancedExpense,
      totalCost: fixedCostPerMember + flightCost - advancedExpense,
      durationMinutes,
      flightsCount: userMovements.length,
    };
  });

  return {
    fixedCostTotal,
    fixedCostPerMember,
    reports: memberReports
  };
}

export async function addTransaction(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const type = String(formData.get("type") || "INCOME");
  const dateRaw = String(formData.get("date") || "");

  if (!description || amount <= 0 || !dateRaw) return;

  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    include: { members: true },
  });

  if (!partnership) return;

  const member = partnership.members.find(m => m.userId === user.id);
  if (!member) return;

  // Only admins can add expenses
  if (type === "EXPENSE" && member.role !== "ADMIN") return;

  await prisma.partnershipTransaction.create({
    data: {
      partnershipId,
      userId: (type === "INCOME" || type === "MEMBER_EXPENSE") ? user.id : null,
      amount,
      type,
      description,
      date: new Date(dateRaw),
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteTransaction(partnershipId: string, transactionId: string) {
  const user = await requireUser();
  
  const partnership = await prisma.partnership.findUnique({
    where: { id: partnershipId },
    include: { members: true },
  });

  if (!partnership) return;

  const isAdmin = partnership.members.find(m => m.userId === user.id)?.role === "ADMIN";
  if (!isAdmin) return; // Only admins can delete transactions

  await prisma.partnershipTransaction.deleteMany({
    where: {
      id: transactionId,
      partnershipId
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function updatePartnershipName(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") || "").trim();

  if (!name) return;

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnership.update({
    where: { id: partnershipId },
    data: { name }
  });

  revalidatePath(`/societa/${partnershipId}`);
  revalidatePath("/societa");
}

export async function deletePartnership(partnershipId: string) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnership.delete({
    where: { id: partnershipId }
  });

  revalidatePath("/societa");
  redirect("/societa" as Route);
}

export async function cancelInvitation(partnershipId: string, invitationId: string) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipInvitation.deleteMany({
    where: {
      id: invitationId,
      partnershipId
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}
