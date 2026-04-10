import { date, z } from "zod";
import { toNumber } from "@/lib/utils";

const nonNegativeInt = z.coerce.number().int().min(0);

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional().or(z.literal("")),
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1),
});

export const settingsSchema = z.object({
  rentalRatePerHour: z.preprocess(toNumber, z.number().positive()),
  instructorRatePerHour: z.preprocess(toNumber, z.number().min(0)),
  currency: z.string().trim().min(3).max(3).default("EUR"),
  dateMedicalExam: z.preprocess((value) => {
  if (typeof value === "string" && value.trim() !== "") {
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? value : date;
  }

  return value;
}, z.date()),
  dateMonoExam: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return value;
  }, z.date().nullable()),
  dateBipoExam: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return value;
  }, z.date().nullable()),
  dateFoniaExam: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return value;
  }, z.date().nullable()),
  dateAdvanced: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) {
      return null;
    }

    if (typeof value === "string") {
      const date = new Date(`${value}T00:00:00.000Z`);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    return value;
  }, z.date().nullable()),
});

export const topupSchema = z.object({
  date: z.string().min(1),
  amount: z.preprocess(toNumber, z.number().positive()),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export const flightSchema = z
  .object({
    date: z.string().min(1),
    aircraft: z.string().trim().min(1).max(50).default("P92"),
    inputMode: z.enum(["HOBBS", "MANUAL"]),
    hobbsStartHours: nonNegativeInt.optional(),
    hobbsStartMinutes: z.coerce.number().int().min(0).max(59).optional(),
    hobbsEndHours: nonNegativeInt.optional(),
    hobbsEndMinutes: z.coerce.number().int().min(0).max(59).optional(),
    manualHours: nonNegativeInt.optional(),
    manualMinutes: z.coerce.number().int().min(0).max(59).optional(),
    instructorName: z.string().trim().max(100).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .superRefine((value, ctx) => {
    if (value.inputMode === "HOBBS") {
      const required = [
        value.hobbsStartHours,
        value.hobbsStartMinutes,
        value.hobbsEndHours,
        value.hobbsEndMinutes,
      ];
      if (required.some((item) => item === undefined)) {
        ctx.addIssue({ code: "custom", message: "Completa partenza e arrivo orametro." });
        return;
      }

      const start = value.hobbsStartHours! * 60 + value.hobbsStartMinutes!;
      const end = value.hobbsEndHours! * 60 + value.hobbsEndMinutes!;
      if (end < start) {
        ctx.addIssue({ code: "custom", message: "L'orametro di arrivo deve essere maggiore o uguale alla partenza." });
      }
      if (end === start) {
        ctx.addIssue({ code: "custom", message: "La durata del volo deve essere maggiore di zero." });
      }
    }

    if (value.inputMode === "MANUAL") {
      const h = value.manualHours ?? 0;
      const m = value.manualMinutes ?? 0;
      if (h === 0 && m === 0) {
        ctx.addIssue({ code: "custom", message: "Inserisci una durata valida." });
      }
    }
  });

export function getDurationMinutes(input: z.infer<typeof flightSchema>) {
  if (input.inputMode === "HOBBS") {
    return (input.hobbsEndHours! * 60 + input.hobbsEndMinutes!) - (input.hobbsStartHours! * 60 + input.hobbsStartMinutes!);
  }

  return (input.manualHours ?? 0) * 60 + (input.manualMinutes ?? 0);
}
