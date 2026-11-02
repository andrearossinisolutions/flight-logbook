"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import { parseRomeDateTime } from "@/lib/utils";
import {
  aircraftLimit,
  parseNonNegative,
  parseRequiredNonNegative,
  tanksLimit,
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

  const tanksMax = tanksLimit(aircraft.hangarCapacityLiters);
  const aircraftMax = aircraftLimit(aircraft.tankCapacityLiters);

  const tanksBefore = parseNonNegative(formData.get("tanksBeforeLiters"), "Taniche prima", { max: tanksMax });
  const aircraftBefore = parseNonNegative(formData.get("aircraftBeforeLiters"), "Aereo prima", { max: aircraftMax });
  const tanksAfter = parseRequiredNonNegative(formData.get("tanksAfterLiters"), "Taniche dopo", { max: tanksMax });
  const aircraftAfter = parseRequiredNonNegative(formData.get("aircraftAfterLiters"), "Aereo dopo", { max: aircraftMax });

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

  await prisma.partnershipFuelLog.create({
    data: {
      aircraftId: aircraft.id,
      partnershipId: aircraft.partnershipId,
      userId: user.id,
      tanksBeforeLiters: tanksBefore,
      aircraftBeforeLiters: aircraftBefore,
      tanksAfterLiters: tanksAfter,
      aircraftAfterLiters: aircraftAfter,
      refueledAt,
    },
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
