import { MovementType } from "@prisma/client";

export type PaymentFormValues = {
  movementType: "TOPUP" | "SERVICE";
  date: string;
  isDraft: boolean;
  amount: string;
  notes: string;
};

function toFloat(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

export function parsePaymentFormData(formData: FormData) {
  const movementTypeRaw = String(formData.get("movementType") ?? "TOPUP");

  if (
    movementTypeRaw !== MovementType.TOPUP &&
    movementTypeRaw !== MovementType.SERVICE
  ) {
    throw new Error("Tipologia movimento non valida.");
  }

  const dateRaw = String(formData.get("date") ?? "");
  const amount = toFloat(formData.get("amount"));
  const notesRaw = String(formData.get("notes") ?? "").trim();

  if (!dateRaw) {
    throw new Error("La data è obbligatoria.");
  }

  if (!Number.isFinite(amount) || amount === 0) {
    throw new Error("L'importo deve essere diverso da zero.");
  }

  const date = new Date(dateRaw);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paymentDate = new Date(date);
  paymentDate.setHours(0, 0, 0, 0);

  return {
    movementType: movementTypeRaw as "TOPUP" | "SERVICE",
    date,
    isDraft: paymentDate > today,
    amount,
    notes: notesRaw || null,
  };
}

export function buildPaymentInitialValues(args: {
  movementType: "TOPUP" | "SERVICE";
  date: Date;
  isDraft: boolean;
  amount: number | string;
  notes: string | null;
}): Partial<PaymentFormValues> {
  return {
    movementType: args.movementType,
    date: new Date(args.date).toISOString().slice(0, 10),
    isDraft: args.isDraft,
    amount: String(Number(args.amount)),
    notes: args.notes ?? "",
  };
}
