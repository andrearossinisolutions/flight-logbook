import { FlightInputMode } from "@prisma/client";

export type FlightFormValues = {
  date: string;
  isDraft: boolean;
  inputMode: "HOBBS" | "MANUAL";
  routeMode: "SINGLE" | "DOUBLE";
  aircraftRegistration: string;
  aircraftType: string;
  passengerName: string;
  instructorName: string;
  instructorMinutes: string;
  hobbsStartHours: string;
  hobbsStartMinutes: string;
  hobbsEndHours: string;
  hobbsEndMinutes: string;
  manualHours: string;
  manualMinutes: string;
  warmupMinutes: string;
  rentalRateApplied: string;
  instructorRateApplied: string;
  notes: string;
};

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

export function splitMinutes(totalMinutes: number | null | undefined) {
  const safe = Math.max(0, totalMinutes ?? 0);
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

export function parseFlightFormData(formData: FormData) {
  const dateRaw = String(formData.get("date") ?? "");
  const notesRaw = String(formData.get("notes") ?? "").trim();

  const aircraftRegistration =
    String(formData.get("aircraftRegistration") ?? "I-4150").trim() || "I-4150";
  const aircraftType =
    String(formData.get("aircraftType") ?? "P92").trim() || "P92";

  const inputModeRaw = String(formData.get("inputMode") ?? FlightInputMode.MANUAL);
  const inputMode: FlightInputMode =
    inputModeRaw === FlightInputMode.HOBBS
      ? FlightInputMode.HOBBS
      : FlightInputMode.MANUAL;

  const passengerNameRaw = String(formData.get("passengerName") ?? "").trim();
  const instructorNameRaw = String(formData.get("instructorName") ?? "").trim();
  const instructorMinutes = toInt(formData.get("instructorMinutes"));

  const rentalRateApplied = toFloat(formData.get("rentalRateApplied"));
  const instructorRateApplied = toFloat(formData.get("instructorRateApplied"));

  const isDraft = formData.get("insertMode") === "FUTURE";

  if (!dateRaw) {
    throw new Error("La data è obbligatoria.");
  }

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

  if (instructorMinutes < 0 || instructorMinutes > durationMinutes) {
    throw new Error("I minuti istruttore devono essere compresi tra 0 e la durata del volo.");
  }

  const rentalCost = (durationMinutes / 60) * rentalRateApplied;
  const instructorCost = (instructorMinutes / 60) * instructorRateApplied;
  const totalCost = rentalCost + instructorCost;
  const movementAmount = -totalCost;

  return {
    date: new Date(dateRaw),
    notes: notesRaw || null,
    aircraftRegistration,
    aircraftType,
    inputMode,
    durationMinutes,
    hobbsStartMinutes,
    hobbsEndMinutes,
    isDraft,
    passengerName: passengerNameRaw || null,
    instructorName: instructorNameRaw || null,
    instructorMinutes,
    rentalRateApplied,
    instructorRateApplied,
    rentalCost,
    instructorCost,
    totalCost,
    movementAmount,
  };
}

export function buildFlightInitialValues(args: {
  movementDate: Date;
  notes: string | null;
  isDraft: boolean;
  flight: {
    inputMode: FlightInputMode;
    aircraftRegistration: string | null;
    aircraftType: string | null;
    passengerName: string | null;
    instructorName: string | null;
    instructorMinutes: number | null;
    durationMinutes: number;
    hobbsStartMinutes: number | null;
    hobbsEndMinutes: number | null;
    rentalRateApplied: number | string;
    instructorRateApplied: number | string;
  };
}): Partial<FlightFormValues> {
  const { movementDate, notes, isDraft, flight } = args;

  const manualPrefill = splitMinutes(flight.durationMinutes);
  const hobbsStartPrefill = splitMinutes(flight.hobbsStartMinutes);
  const hobbsEndPrefill = splitMinutes(flight.hobbsEndMinutes);

  return {
    date: new Date(movementDate).toISOString().slice(0, 10),
    isDraft: isDraft,
    inputMode: flight.inputMode === FlightInputMode.HOBBS ? "HOBBS" : "MANUAL",
    routeMode: "SINGLE",
    aircraftRegistration: flight.aircraftRegistration ?? "I-4150",
    aircraftType: flight.aircraftType ?? "P92",
    passengerName: flight.passengerName ?? "",
    instructorName: flight.instructorName ?? "",
    instructorMinutes: String(flight.instructorMinutes ?? 0),
    hobbsStartHours: String(hobbsStartPrefill.hours),
    hobbsStartMinutes: String(hobbsStartPrefill.minutes),
    hobbsEndHours: String(hobbsEndPrefill.hours),
    hobbsEndMinutes: String(hobbsEndPrefill.minutes),
    manualHours: String(manualPrefill.hours),
    manualMinutes: String(manualPrefill.minutes),
    rentalRateApplied: String(Number(flight.rentalRateApplied)),
    instructorRateApplied: String(Number(flight.instructorRateApplied)),
    notes: notes ?? "",
  };
}