import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { FlightInputMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MovementsEditForm } from "./movements-edit-form";
import { MovementType } from "@prisma/client";

function formatDateInput(value: Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function toInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function toFloat(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function splitMinutes(totalMinutes: number | null | undefined) {
  const safe = Math.max(0, totalMinutes ?? 0);
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

export default async function EditMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const movement = await prisma.movement.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      flight: true,
    },
  });

  if (!movement) {
    notFound();
  }

  const isTopup = movement.type === "TOPUP";
  const flight = movement.flight;

  const manualPrefill = splitMinutes(flight?.durationMinutes);
  const hobbsStartPrefill = splitMinutes(flight?.hobbsStartMinutes);
  const hobbsEndPrefill = splitMinutes(flight?.hobbsEndMinutes);

  async function updateMovement(formData: FormData) {
    "use server";

    const user = await requireUser();
    const movementId = String(formData.get("movementId") ?? "");
    const movementTypeRaw = String(formData.get("movementType") ?? "");
    if (!Object.values(MovementType).includes(movementTypeRaw as MovementType)) {
      throw new Error("Tipologia movimento non valida.");
    }
    const movementType = movementTypeRaw as MovementType;

    const dbMovement = await prisma.movement.findFirst({
      where: {
        id: movementId,
        userId: user.id,
      },
      include: {
        flight: true,
      },
    });

    if (!dbMovement) {
      throw new Error("Movimento non trovato.");
    }

    const dateRaw = String(formData.get("date") ?? "");
    const notesRaw = String(formData.get("notes") ?? "").trim();

    if (!dateRaw) {
      throw new Error("La data è obbligatoria.");
    }

    if (movementType === "TOPUP" || movementType === "SERVICE") {
      const amount = toFloat(formData.get("amount"));

      if (!Number.isFinite(amount) || amount === 0) {
        throw new Error("L'importo deve essere diverso da zero.");
      }

      await prisma.movement.update({
        where: { id: dbMovement.id },
        data: {
          type: movementType,
          date: new Date(dateRaw),
          amount,
          notes: notesRaw || null,
        },
      });

      revalidatePath("/dashboard");
      redirect("/dashboard");
    }

    if (movementType !== "FLIGHT" || !dbMovement.flight) {
      throw new Error("Tipo movimento non valido.");
    }

    const aircraftRegistration =
      String(formData.get("aircraftRegistration") ?? "I-4150").trim() || "I-4150";
    const aircraftType =
      String(formData.get("aircraftType") ?? "P92").trim() || "P92";

    const inputModeRaw = String(formData.get("inputMode") ?? FlightInputMode.MANUAL);
    const inputMode: FlightInputMode =
      inputModeRaw === FlightInputMode.HOBBS
        ? FlightInputMode.HOBBS
        : FlightInputMode.MANUAL;

    const instructorNameRaw = String(formData.get("instructorName") ?? "").trim();

    const rentalRateApplied = toFloat(formData.get("rentalRateApplied"));
    const instructorRateApplied = toFloat(formData.get("instructorRateApplied"));

    if (rentalRateApplied < 0 || instructorRateApplied < 0) {
      throw new Error("Le tariffe non possono essere negative.");
    }

    const manualHours = toInt(formData.get("manualHours"));
    const manualMinutes = toInt(formData.get("manualMinutes"));

    const hobbsStartHours = toInt(formData.get("hobbsStartHours"));
    const hobbsStartMinutesOnly = toInt(formData.get("hobbsStartMinutes"));
    const hobbsEndHours = toInt(formData.get("hobbsEndHours"));
    const hobbsEndMinutesOnly = toInt(formData.get("hobbsEndMinutes"));

    let durationMinutes = 0;
    let hobbsStartMinutes: number | null = null;
    let hobbsEndMinutes: number | null = null;

    if (inputMode === FlightInputMode.HOBBS) {
      if (hobbsStartMinutesOnly < 0 || hobbsStartMinutesOnly > 59) {
        throw new Error("I minuti dell'orametro di partenza devono essere tra 0 e 59.");
      }

      if (hobbsEndMinutesOnly < 0 || hobbsEndMinutesOnly > 59) {
        throw new Error("I minuti dell'orametro di arrivo devono essere tra 0 e 59.");
      }

      hobbsStartMinutes = hobbsStartHours * 60 + hobbsStartMinutesOnly;
      hobbsEndMinutes = hobbsEndHours * 60 + hobbsEndMinutesOnly;

      if (hobbsEndMinutes < hobbsStartMinutes) {
        throw new Error("L'orametro di arrivo deve essere maggiore o uguale a quello di partenza.");
      }

      durationMinutes = hobbsEndMinutes - hobbsStartMinutes;
    } else {
      if (manualMinutes < 0 || manualMinutes > 59) {
        throw new Error("I minuti manuali devono essere tra 0 e 59.");
      }

      durationMinutes = manualHours * 60 + manualMinutes;
      hobbsStartMinutes = null;
      hobbsEndMinutes = null;
    }

    if (durationMinutes <= 0) {
      throw new Error("La durata del volo deve essere maggiore di zero.");
    }

    const hasInstructor = instructorNameRaw.length > 0;
    const durationHours = durationMinutes / 60;

    const rentalCost = durationHours * rentalRateApplied;
    const instructorCost = hasInstructor ? durationHours * instructorRateApplied : 0;
    const totalCost = rentalCost + instructorCost;
    const movementAmount = -totalCost;

    await prisma.$transaction(async (tx) => {
      await tx.flight.update({
        where: {
          movementId: dbMovement.id,
        },
        data: {
          aircraftRegistration,
          aircraftType,
          inputMode,
          durationMinutes,
          hobbsStartMinutes,
          hobbsEndMinutes,
          instructorName: hasInstructor ? instructorNameRaw : null,
          rentalRateApplied,
          instructorRateApplied,
          rentalCost,
          instructorCost,
          totalCost,
        },
      });

      await tx.movement.update({
        where: { id: dbMovement.id },
        data: {
          date: new Date(dateRaw),
          amount: movementAmount,
          notes: notesRaw || null,
        },
      });
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  async function deleteMovement(formData: FormData) {
    "use server";

    const user = await requireUser();
    const movementId = String(formData.get("movementId") ?? "");

    const dbMovement = await prisma.movement.findFirst({
      where: {
        id: movementId,
        userId: user.id,
      },
      include: {
        flight: true,
      },
    });

    if (!dbMovement) {
      throw new Error("Movimento non trovato.");
    }

    await prisma.$transaction(async (tx) => {
      if (dbMovement.flight) {
        await tx.flight.delete({
          where: { movementId: dbMovement.id },
        });
      }

      await tx.movement.delete({
        where: { id: dbMovement.id },
      });
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  const movementForClient = {
    ...movement,
    amount: Number(movement.amount),
    date: movement.date.toISOString(),
    createdAt: movement.createdAt.toISOString(),
    updatedAt: movement.updatedAt.toISOString(),
    flight: movement.flight
      ? {
          ...movement.flight,
          rentalRateApplied: Number(movement.flight.rentalRateApplied),
          instructorRateApplied: Number(movement.flight.instructorRateApplied),
          rentalCost: Number(movement.flight.rentalCost),
          instructorCost: Number(movement.flight.instructorCost),
          totalCost: Number(movement.flight.totalCost),
          createdAt: movement.flight.createdAt.toISOString(),
          updatedAt: movement.flight.updatedAt.toISOString(),
        }
      : null,
  };

  return (
    <AppShell
      title={isTopup ? "Modifica pagamento" : "Modifica volo"}
      subtitle={
        isTopup
          ? "Puoi usare importi positivi o negativi."
          : "Puoi correggere durata, istruttore e tariffe applicate."
      }
    >
      <MovementsEditForm
        movement={movementForClient}
        manualPrefill={manualPrefill}
        hobbsStartPrefill={hobbsStartPrefill}
        hobbsEndPrefill={hobbsEndPrefill}
        updateMovement={updateMovement}
        deleteMovement={deleteMovement}
      />
    </AppShell>
  );
}