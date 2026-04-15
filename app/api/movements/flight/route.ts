import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { FlightInputMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

function parseNumber(value: FormDataEntryValue | null) {
  if (value === null) return null;
  const str = String(value).trim();
  if (str === "") return null;

  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseIntValue(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = parseNumber(value);
  if (parsed === null) return fallback;
  return Math.trunc(parsed);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const formData = await request.formData();

  const dateRaw = String(formData.get("date") ?? "");
  const aircraftRegistration =
    String(formData.get("aircraftRegistration") ?? "I-4150").trim() || "I-4150";
  const aircraftType =
    String(formData.get("aircraftType") ?? "P92").trim() || "P92";
  const inputModeRaw = String(formData.get("inputMode") ?? FlightInputMode.HOBBS);

  const instructorName = String(formData.get("instructorName") ?? "").trim();
  const instructorMinutes = parseIntValue(formData.get("instructorMinutes"));

  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!dateRaw) {
    return NextResponse.json({ error: "La data è obbligatoria." }, { status: 400 });
  }

  const inputMode: FlightInputMode =
    inputModeRaw === FlightInputMode.MANUAL
      ? FlightInputMode.MANUAL
      : FlightInputMode.HOBBS;

  const hobbsStartHours = parseIntValue(formData.get("hobbsStartHours"));
  const hobbsStartMinutesOnly = parseIntValue(formData.get("hobbsStartMinutes"));
  const hobbsEndHours = parseIntValue(formData.get("hobbsEndHours"));
  const hobbsEndMinutesOnly = parseIntValue(formData.get("hobbsEndMinutes"));

  const manualHours = parseIntValue(formData.get("manualHours"));
  const manualMinutes = parseIntValue(formData.get("manualMinutes"));

  let durationMinutes = 0;
  let hobbsStartMinutes: number | null = null;
  let hobbsEndMinutes: number | null = null;

  if (inputMode === FlightInputMode.HOBBS) {
    if (hobbsStartMinutesOnly < 0 || hobbsStartMinutesOnly > 59) {
      return NextResponse.json(
        { error: "I minuti dell'orametro di partenza devono essere tra 0 e 59." },
        { status: 400 }
      );
    }

    if (hobbsEndMinutesOnly < 0 || hobbsEndMinutesOnly > 59) {
      return NextResponse.json(
        { error: "I minuti dell'orametro di arrivo devono essere tra 0 e 59." },
        { status: 400 }
      );
    }

    hobbsStartMinutes = hobbsStartHours * 60 + hobbsStartMinutesOnly;
    hobbsEndMinutes = hobbsEndHours * 60 + hobbsEndMinutesOnly;

    if (hobbsEndMinutes < hobbsStartMinutes) {
      return NextResponse.json(
        { error: "L'orametro di arrivo deve essere maggiore o uguale a quello di partenza." },
        { status: 400 }
      );
    }

    durationMinutes = hobbsEndMinutes - hobbsStartMinutes;
  } else {
    if (manualMinutes < 0 || manualMinutes > 59) {
      return NextResponse.json(
        { error: "I minuti manuali devono essere tra 0 e 59." },
        { status: 400 }
      );
    }

    durationMinutes = manualHours * 60 + manualMinutes;
  }

  if (durationMinutes <= 0) {
    return NextResponse.json(
      { error: "La durata del volo deve essere maggiore di zero." },
      { status: 400 }
    );
  }

  const settings = user.settings;

  const rentalRateFromForm = parseNumber(formData.get("rentalRateApplied"));
  const instructorRateFromForm = parseNumber(formData.get("instructorRateApplied"));

  const rentalRateApplied =
    rentalRateFromForm ?? Number(settings?.rentalRatePerHour ?? 150);

  const instructorRateApplied =
    instructorRateFromForm ?? Number(settings?.instructorRatePerHour ?? 80);

  if (rentalRateApplied < 0 || instructorRateApplied < 0) {
    return NextResponse.json(
      { error: "Le tariffe non possono essere negative." },
      { status: 400 }
    );
  }

  const durationHours = durationMinutes / 60;

  const rentalCost = durationHours * rentalRateApplied;
  const instructorCost = durationHours * instructorRateApplied;
  const totalCost = rentalCost + instructorCost;
  const movementAmount = -totalCost;

  await prisma.$transaction(async (tx) => {
    const movement = await tx.movement.create({
      data: {
        userId: user.id,
        type: "FLIGHT",
        date: new Date(dateRaw),
        amount: movementAmount,
        notes: notesRaw || null,
      },
    });

    await tx.flight.create({
      data: {
        movementId: movement.id,
        aircraftRegistration,
        aircraftType,
        inputMode,
        durationMinutes,
        hobbsStartMinutes,
        hobbsEndMinutes,
        instructorName,
        instructorMinutes,
        rentalRateApplied,
        instructorRateApplied,
        rentalCost,
        instructorCost,
        totalCost,
      },
    });
  });

  redirect("/dashboard");
}