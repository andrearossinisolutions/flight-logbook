"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { parseRomeDateTime } from "@/lib/utils";
import {
  MAX_TECHNICAL_LITERS,
  aircraftLimit,
  parseNonNegative,
  parseRequiredNonNegative,
  tanksLimit,
  tanksRefuelExpenseDescription,
} from "@/lib/fuel";

export async function createRefuel(formData: FormData) {
  const user = await requireUser();

  const aircraftId = String(formData.get("aircraftId") ?? "").trim();
  if (!aircraftId) throw new Error("Seleziona un aereo.");

  // La società si ricava dall'aereo: mai fidarsi di id società provenienti dal form.
  const aircraft = await prisma.partnershipAircraft.findUnique({
    where: { id: aircraftId },
    select: {
      id: true,
      registration: true,
      partnershipId: true,
      tankCapacityLiters: true,
      hangarCapacityLiters: true,
    },
  });
  if (!aircraft) throw new Error("Aereo non trovato.");

  const membership = await prisma.partnershipMember.findUnique({
    where: {
      partnershipId_userId: { partnershipId: aircraft.partnershipId, userId: user.id },
    },
  });
  if (!membership) throw new Error("Non fai parte della società di questo aereo.");

  const kind = String(formData.get("kind") ?? "AIRCRAFT") === "TANKS" ? "TANKS" : "AIRCRAFT";
  const tanksMax = tanksLimit(aircraft.hangarCapacityLiters);
  const aircraftMax = aircraftLimit(aircraft.tankCapacityLiters);

  let tanksBefore: number | null;
  let tanksAfter: number;
  let aircraftBefore: number | null = null;
  let aircraftAfter: number | null = null;
  let filled: number | null = null;

  if (kind === "TANKS") {
    // Rifornimento delle sole taniche: i campi dell'aereo vengono ignorati.
    const before = parseRequiredNonNegative(formData.get("tanksBeforeLiters"), "Litri nelle taniche prima", { max: tanksMax });
    const added = parseRequiredNonNegative(formData.get("filledLiters"), "Litri aggiunti", { max: MAX_TECHNICAL_LITERS });
    if (!(added > 0)) throw new Error("Litri aggiunti: inserisci un valore maggiore di zero.");
    tanksBefore = before;
    filled = added;
    tanksAfter = Math.round((before + added) * 10) / 10;
    if (tanksAfter > tanksMax) {
      throw new Error(`Il totale in hangar (${tanksAfter} L) supera la capacità delle taniche (${tanksMax} L).`);
    }
  } else {
    tanksBefore = parseNonNegative(formData.get("tanksBeforeLiters"), "Taniche prima", { max: tanksMax });
    aircraftBefore = parseNonNegative(formData.get("aircraftBeforeLiters"), "Aereo prima", { max: aircraftMax });
    tanksAfter = parseRequiredNonNegative(formData.get("tanksAfterLiters"), "Taniche dopo", { max: tanksMax });
    aircraftAfter = parseRequiredNonNegative(formData.get("aircraftAfterLiters"), "Aereo dopo", { max: aircraftMax });

    if (tanksBefore !== null && tanksAfter > tanksBefore) {
      throw new Error("I litri nelle taniche dopo il rifornimento non possono essere più di quelli di prima.");
    }
    if (aircraftBefore !== null && aircraftAfter < aircraftBefore) {
      throw new Error("I litri dell'aereo dopo il rifornimento non possono essere meno di quelli di prima.");
    }
  }

  const dateRaw = String(formData.get("refueledAt") ?? "").trim();
  let refueledAt = new Date();
  if (dateRaw) {
    const parsed = parseRomeDateTime(dateRaw);
    if (!parsed || Number.isNaN(parsed.getTime())) throw new Error("Data e ora non valide.");
    // Un rifornimento futuro falserebbe lo stato attuale (ultimo per data).
    if (parsed.getTime() > Date.now() + 10 * 60 * 1000) {
      throw new Error("La data del rifornimento non può essere nel futuro.");
    }
    refueledAt = parsed;
  }

  let pricePaid: number | null = null;
  let addExpense = false;
  if (kind === "TANKS") {
    const rawPrice = parseNonNegative(formData.get("pricePaid"), "Prezzo pagato", { max: 100000, decimals: 2 });
    pricePaid = rawPrice !== null && rawPrice > 0 ? rawPrice : null;
    // Eleggibilità ricalcolata dal server: società con spese dei soci (cassa comune disattivata).
    const partnership = await prisma.partnership.findUnique({
      where: { id: aircraft.partnershipId },
      select: { disableSharedFund: true },
    });
    addExpense = !!partnership?.disableSharedFund && formData.get("addExpense") === "on";
    if (addExpense && pricePaid === null) {
      throw new Error("Prezzo pagato: inserisci un importo maggiore di zero per aggiungere la spesa.");
    }
  }

  await prisma.$transaction(async (tx) => {
    const log = await tx.partnershipFuelLog.create({
      data: {
        aircraftId: aircraft.id,
        partnershipId: aircraft.partnershipId,
        userId: user.id,
        kind,
        tanksBeforeLiters: tanksBefore,
        aircraftBeforeLiters: aircraftBefore,
        tanksAfterLiters: tanksAfter,
        aircraftAfterLiters: aircraftAfter,
        filledLiters: filled,
        pricePaid,
        refueledAt,
      },
    });
    if (addExpense && pricePaid !== null && filled !== null) {
      await tx.partnershipTransaction.create({
        data: {
          partnershipId: aircraft.partnershipId,
          userId: user.id,
          recipientId: null,
          amount: pricePaid,
          type: "MEMBER_EXPENSE_HOURS",
          description: tanksRefuelExpenseDescription({ date: refueledAt, liters: filled, registration: aircraft.registration }),
          date: refueledAt,
          fuelLogId: log.id,
        },
      });
    }
  });

  revalidatePath("/logbook");
  revalidatePath(`/societa/${aircraft.partnershipId}`);
  redirect("/logbook" as Route);
}

export async function deleteRefuel(formData: FormData) {
  const user = await requireUser();
  const logId = String(formData.get("logId") ?? "").trim();
  if (!logId) throw new Error("Rifornimento mancante.");

  const log = await prisma.partnershipFuelLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error("Rifornimento non trovato.");

  const membership = await prisma.partnershipMember.findUnique({
    where: {
      partnershipId_userId: { partnershipId: log.partnershipId, userId: user.id },
    },
  });
  if (!membership) throw new Error("Non fai parte della società di questo rifornimento.");

  const canDelete = log.userId === user.id || membership.role === "ADMIN";
  if (!canDelete) throw new Error("Puoi eliminare solo i rifornimenti registrati da te (o essere amministratore).");

  await prisma.partnershipFuelLog.delete({ where: { id: log.id } });

  revalidatePath("/logbook");
  revalidatePath(`/societa/${log.partnershipId}`);
}
