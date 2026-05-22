"use server";

import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { sendEmail } from "@/lib/mail";
import { renderBoardMessageEmail } from "@/lib/board-message-email";

async function createRecommendedRemindersDb(tx: any, aircraftId: string) {
  // 1. Sostituzione gomme
  const rGomme = await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "Sostituzione gomme",
      hoursInterval: null,
      monthsInterval: 60,
      lastCompletedHours: 0.0,
      lastCompletedDate: new Date(),
      notes: "Sostituzione tassativa di tutte le parti in gomma (tubi carburante, manicotti dell'acqua, membrane dei carburatori, tubi dell'olio)",
    }
  });

  // 2. 50h
  const r50 = await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "50h",
      hoursInterval: 50,
      monthsInterval: 12,
      lastCompletedHours: 0.0,
      lastCompletedDate: new Date(),
      notes: "Cambio olio e filtro dell'olio",
    }
  });

  // 3. 100h
  const r100 = await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "100h",
      hoursInterval: 100,
      monthsInterval: null,
      lastCompletedHours: 0.0,
      lastCompletedDate: null,
      notes: "50h + sostituzione candele, pulizia filtro carburante, controllo gioco valvole, verifica allineamento e bilanciamento carburatori, test di compressione dei cilindri, e controllo stato manicotti e serraggi generali",
      covers: {
        connect: [{ id: r50.id }]
      }
    }
  });

  // 4. 200h
  const r200 = await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "200h",
      hoursInterval: 200,
      monthsInterval: null,
      lastCompletedHours: 0.0,
      lastCompletedDate: null,
      notes: "100h + controlli specifici impianto elettrico (es. alternatore, cavi candele), e verifiche approfondite carburatori",
      covers: {
        connect: [{ id: r50.id }, { id: r100.id }]
      }
    }
  });

  // 5. 600h
  const r600 = await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "600h",
      hoursInterval: 600,
      monthsInterval: null,
      lastCompletedHours: 0.7,
      lastCompletedDate: null,
      notes: "200h + Controllo approfondito scatola di riduzione (riduttore dell'elica) e frizione parastrappi",
      covers: {
        connect: [{ id: r50.id }, { id: r100.id }, { id: r200.id }]
      }
    }
  });

  // 6. 1000h / 1200h
  const r1200 = await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "1000h / 1200h",
      hoursInterval: 1200,
      monthsInterval: null,
      lastCompletedHours: 0.7,
      lastCompletedDate: null,
      notes: "600h + Controllo generale stato usura passaggi interni e componenti critici, con eventuale revisione dei carburatori",
      covers: {
        connect: [{ id: r50.id }, { id: r100.id }, { id: r200.id }, { id: r600.id }]
      }
    }
  });

  // 7. TBO (Revisione motore)
  await tx.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description: "TBO (Revisione motore)",
      hoursInterval: 2000,
      monthsInterval: 180, // 15 anni * 12 mesi = 180 mesi
      lastCompletedHours: 0.0,
      lastCompletedDate: new Date(),
      notes: "Revisione totale motore (TBO - Time Between Overhaul). Generalmente ogni 2000 ore o 15 anni (1200h / 1500h per i motori più vecchi). Revisione totale motore e azzeramento ore.",
      covers: {
        connect: [{ id: rGomme.id }, { id: r50.id }, { id: r100.id }, { id: r200.id }, { id: r600.id }, { id: r1200.id }]
      }
    }
  });
}

export async function addAircraft(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const registration = String(formData.get("registration") || "").trim();
  const type = String(formData.get("type") || "").trim();
  const hourlyFuelCost = Number(formData.get("hourlyFuelCost") || 0);
  const hourlyMaintCost = Number(formData.get("hourlyMaintCost") || 0);
  const hourlyEngineFund = Number(formData.get("hourlyEngineFund") || 0);
  const initialHours = Number(formData.get("initialHours") || 0);
  const addRecommended = formData.get("addRecommended") === "on";

  if (!registration || !type) return;

  // check permissions
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (membership?.role !== "ADMIN") return;

  await prisma.$transaction(async (tx) => {
    const aircraft = await tx.partnershipAircraft.create({
      data: {
        partnershipId,
        registration,
        type,
        hourlyFuelCost,
        hourlyMaintCost,
        hourlyEngineFund,
        initialHours,
      }
    });

    if (addRecommended) {
      await createRecommendedRemindersDb(tx, aircraft.id);
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function addFixedCost(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const description = String(formData.get("description") || "").trim();
  const amount = Number(formData.get("amount") || 0);
  const period = String(formData.get("period") || "MONTHLY").trim();
  const billingMonthStr = formData.get("billingMonth");
  const billingMonth = billingMonthStr ? Number(billingMonthStr) : null;
  const billingYearStr = formData.get("billingYear");
  const billingYear = billingYearStr ? Number(billingYearStr) : null;

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
      billingMonth,
      billingYear,
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
        role: "MEMBER",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    // Recuperiamo il nome della società per l'email
    const partnership = await prisma.partnership.findUnique({
      where: { id: partnershipId }
    });

    const societyName = partnership?.name || "Società di volo";

    // Prepariamo l'email
    const appUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
  const initialHours = Number(formData.get("initialHours") || 0);

  if (!registration || !type) return;

  await prisma.partnershipAircraft.updateMany({
    where: { id: aircraftId, partnershipId },
    data: {
      registration,
      type,
      hourlyFuelCost,
      hourlyMaintCost,
      hourlyEngineFund,
      initialHours,
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
  const billingMonthStr = formData.get("billingMonth");
  const billingMonth = billingMonthStr ? Number(billingMonthStr) : null;
  const billingYearStr = formData.get("billingYear");
  const billingYear = billingYearStr ? Number(billingYearStr) : null;

  if (!description || amount <= 0) return;

  await prisma.partnershipFixedCost.updateMany({
    where: { id: costId, partnershipId },
    data: {
      description,
      amount,
      period,
      billingMonth,
      billingYear,
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

  const fixedCostTotal = partnership.fixedCosts.reduce((acc, c) => {
    if (c.period === 'MONTHLY') return acc + Number(c.amount);
    if (c.period === 'YEARLY_PRORATED' || c.period === 'YEARLY') return acc + (Number(c.amount) / 12);
    if (c.period === 'YEARLY_ONCE') {
      return (c.billingMonth === month + 1) ? acc + Number(c.amount) : acc;
    }
    if (c.period === 'ONE_OFF') {
      return (c.billingMonth === month + 1 && c.billingYear === year) ? acc + Number(c.amount) : acc;
    }
    return acc;
  }, 0);
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

export async function addMessage(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  const content = String(formData.get("content") || "").trim();

  if (!content) return;

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } },
    include: {
      partnership: {
        include: {
          members: {
            include: { user: true }
          }
        }
      }
    }
  });

  if (!membership) return;

  await prisma.partnershipMessage.create({
    data: {
      content,
      partnershipId,
      userId: user.id,
    }
  });

  // Invia email a tutti gli altri membri
  const partnership = membership.partnership;
  const authorName = user.fullName || user.email;
  
  const otherMembers = partnership.members.filter(m => m.userId !== user.id);
  
  if (otherMembers.length > 0) {
    const html = renderBoardMessageEmail(partnership.name, authorName, content, partnershipId);
    
    // Invia le email in modo asincrono (fire and forget)
    Promise.allSettled(
      otherMembers.map(m => 
        sendEmail({
          to: m.user.email,
          subject: `Nuovo messaggio in bacheca - ${partnership.name}`,
          html,
        })
      )
    ).catch(console.error);
  }

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteMessage(partnershipId: string, messageId: string) {
  const user = await requireUser();

  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });

  if (!membership) return;

  const message = await prisma.partnershipMessage.findUnique({
    where: { id: messageId }
  });

  if (!message || message.partnershipId !== partnershipId) return;

  // Solo l'autore del messaggio o un admin può eliminare
  if (message.userId !== user.id && membership.role !== "ADMIN") return;

  await prisma.partnershipMessage.delete({
    where: { id: messageId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function addAircraftReminder(partnershipId: string, aircraftId: string, formData: FormData) {
  const user = await requireUser();
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (membership?.role !== "ADMIN") return;

  const description = String(formData.get("description") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  
  const hoursIntervalRaw = formData.get("hoursInterval");
  const hoursInterval = hoursIntervalRaw && hoursIntervalRaw !== "" ? Number(hoursIntervalRaw) : null;

  const monthsIntervalRaw = formData.get("monthsInterval");
  const monthsInterval = monthsIntervalRaw && monthsIntervalRaw !== "" ? Number(monthsIntervalRaw) : null;

  if (!description) return;
  if ((hoursInterval === null || hoursInterval <= 0) && (monthsInterval === null || monthsInterval <= 0)) {
    throw new Error("Specificare almeno un intervallo orario o temporale.");
  }

  // Calculate default lastCompletedHours from aircraft current hours if not specified
  const lastCompletedHoursInput = formData.get("lastCompletedHours");
  let lastCompletedHoursNum = lastCompletedHoursInput ? Number(lastCompletedHoursInput) : null;

  if (lastCompletedHoursNum === null || isNaN(lastCompletedHoursNum)) {
    // Fetch aircraft flights to calculate current hours
    const aircraft = await prisma.partnershipAircraft.findUnique({
      where: { id: aircraftId },
      include: {
        flights: {
          where: { movement: { isDraft: false } },
          select: { durationMinutes: true }
        }
      }
    });
    if (!aircraft) return;
    const flightMinutes = aircraft.flights.reduce((sum, f) => sum + f.durationMinutes, 0);
    lastCompletedHoursNum = Number(aircraft.initialHours) + (flightMinutes / 60);
  }

  const lastCompletedDateInput = formData.get("lastCompletedDate");
  const lastCompletedDate = lastCompletedDateInput && lastCompletedDateInput !== "" 
    ? new Date(String(lastCompletedDateInput)) 
    : new Date();

  const coversIds = formData.getAll("covers").map(String);

  await prisma.partnershipAircraftReminder.create({
    data: {
      aircraftId,
      description,
      notes: notes || null,
      hoursInterval: hoursInterval || null,
      monthsInterval: monthsInterval || null,
      lastCompletedHours: lastCompletedHoursNum,
      lastCompletedDate,
      covers: {
        connect: coversIds.map(id => ({ id }))
      }
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function updateAircraftReminder(partnershipId: string, reminderId: string, formData: FormData) {
  const user = await requireUser();
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (membership?.role !== "ADMIN") return;

  const description = String(formData.get("description") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  
  const hoursIntervalRaw = formData.get("hoursInterval");
  const hoursInterval = hoursIntervalRaw && hoursIntervalRaw !== "" ? Number(hoursIntervalRaw) : null;

  const monthsIntervalRaw = formData.get("monthsInterval");
  const monthsInterval = monthsIntervalRaw && monthsIntervalRaw !== "" ? Number(monthsIntervalRaw) : null;

  if (!description) return;
  if ((hoursInterval === null || hoursInterval <= 0) && (monthsInterval === null || monthsInterval <= 0)) {
    throw new Error("Specificare almeno un intervallo orario o temporale.");
  }

  const lastCompletedHoursInput = formData.get("lastCompletedHours");
  const lastCompletedHoursNum = lastCompletedHoursInput && lastCompletedHoursInput !== "" 
    ? Number(lastCompletedHoursInput) 
    : 0;

  const lastCompletedDateInput = formData.get("lastCompletedDate");
  const lastCompletedDate = lastCompletedDateInput && lastCompletedDateInput !== "" 
    ? new Date(String(lastCompletedDateInput)) 
    : new Date();

  const coversIds = formData.getAll("covers").map(String);

  await prisma.partnershipAircraftReminder.update({
    where: { id: reminderId },
    data: {
      description,
      notes: notes || null,
      hoursInterval: hoursInterval || null,
      monthsInterval: monthsInterval || null,
      lastCompletedHours: lastCompletedHoursNum,
      lastCompletedDate,
      covers: {
        set: coversIds.map(id => ({ id }))
      }
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteAircraftReminder(partnershipId: string, reminderId: string) {
  const user = await requireUser();
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipAircraftReminder.delete({
    where: { id: reminderId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function logAircraftMaintenance(partnershipId: string, reminderId: string, formData: FormData) {
  const user = await requireUser();
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (membership?.role !== "ADMIN") return;

  const reminder = await prisma.partnershipAircraftReminder.findUnique({
    where: { id: reminderId },
    include: { 
      aircraft: true
    }
  });
  if (!reminder) return;

  // Collect all covered reminders transitively (recursive)
  const allCoveredReminders: { id: string; description: string }[] = [];
  const visited = new Set<string>([reminderId]);

  async function collectCovers(id: string) {
    const r = await prisma.partnershipAircraftReminder.findUnique({
      where: { id },
      include: { covers: true }
    });
    if (!r) return;
    for (const c of r.covers) {
      if (!visited.has(c.id)) {
        visited.add(c.id);
        allCoveredReminders.push({ id: c.id, description: c.description });
        await collectCovers(c.id);
      }
    }
  }

  await collectCovers(reminderId);

  const performedAtHours = Number(formData.get("performedAtHours") || 0);
  const dateInput = String(formData.get("date") || "");
  const date = dateInput ? new Date(dateInput) : new Date();
  const notes = String(formData.get("notes") || "").trim();

  await prisma.$transaction(async (tx) => {
    // 1. Update reminder last completed hours & date
    await tx.partnershipAircraftReminder.update({
      where: { id: reminderId },
      data: { 
        lastCompletedHours: performedAtHours,
        lastCompletedDate: date
      }
    });

    // 2. Create history log
    await tx.partnershipAircraftMaintenanceLog.create({
      data: {
        aircraftId: reminder.aircraftId,
        description: `Esecuzione: ${reminder.description}`,
        performedAtHours,
        date,
        notes: notes || null,
      }
    });

    // 3. Update all covered reminders
    for (const covered of allCoveredReminders) {
      await tx.partnershipAircraftReminder.update({
        where: { id: covered.id },
        data: {
          lastCompletedHours: performedAtHours,
          lastCompletedDate: date
        }
      });

      // Create history log for the covered reminder
      await tx.partnershipAircraftMaintenanceLog.create({
        data: {
          aircraftId: reminder.aircraftId,
          description: `Esecuzione: ${covered.description} (coperta da ${reminder.description})`,
          performedAtHours,
          date,
          notes: notes ? `Tramite ${reminder.description}. Note: ${notes}` : `Eseguita tramite ${reminder.description}`,
        }
      });
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteMaintenanceLog(partnershipId: string, logId: string) {
  const user = await requireUser();
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (membership?.role !== "ADMIN") return;

  await prisma.partnershipAircraftMaintenanceLog.delete({
    where: { id: logId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function addRecommendedReminders(partnershipId: string, aircraftId: string) {
  const user = await requireUser();
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (membership?.role !== "ADMIN") return;

  await prisma.$transaction(async (tx) => {
    await createRecommendedRemindersDb(tx, aircraftId);
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function addBooking(partnershipId: string, formData: FormData) {
  const user = await requireUser();
  
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (!membership) {
    throw new Error("Non hai i permessi per questa società.");
  }

  const aircraftId = String(formData.get("aircraftId") || "").trim();
  const startTimeRaw = String(formData.get("startTime") || "").trim();
  const endTimeRaw = String(formData.get("endTime") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!aircraftId || !startTimeRaw || !endTimeRaw) {
    throw new Error("Tutti i campi obbligatori devono essere compilati.");
  }

  const startDateTime = new Date(startTimeRaw);
  const endDateTime = new Date(endTimeRaw);

  if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
    throw new Error("Date inserite non valide.");
  }

  if (startDateTime >= endDateTime) {
    throw new Error("La data di inizio deve essere precedente alla data di fine.");
  }

  // Check overlap for the same aircraft
  const overlappingBooking = await prisma.partnershipBooking.findFirst({
    where: {
      aircraftId,
      startTime: {
        lt: endDateTime
      },
      endTime: {
        gt: startDateTime
      }
    },
    include: {
      user: true
    }
  });

  if (overlappingBooking) {
    const occupantName = overlappingBooking.user.fullName || overlappingBooking.user.email;
    throw new Error(`L'aereo è già prenotato da ${occupantName} nel periodo selezionato.`);
  }

  await prisma.partnershipBooking.create({
    data: {
      partnershipId,
      userId: user.id,
      aircraftId,
      startTime: startDateTime,
      endTime: endDateTime,
      notes: notes || null
    }
  });

  revalidatePath(`/societa/${partnershipId}`);
}

export async function deleteBooking(partnershipId: string, bookingId: string) {
  const user = await requireUser();
  
  const membership = await prisma.partnershipMember.findUnique({
    where: { partnershipId_userId: { partnershipId, userId: user.id } }
  });
  if (!membership) {
    throw new Error("Non hai i permessi per questa società.");
  }

  const booking = await prisma.partnershipBooking.findUnique({
    where: { id: bookingId }
  });

  if (!booking) {
    throw new Error("Prenotazione non trovata.");
  }

  if (booking.userId !== user.id && membership.role !== "ADMIN") {
    throw new Error("Non hai i permessi per eliminare questa prenotazione.");
  }

  await prisma.partnershipBooking.delete({
    where: { id: bookingId }
  });

  revalidatePath(`/societa/${partnershipId}`);
}


