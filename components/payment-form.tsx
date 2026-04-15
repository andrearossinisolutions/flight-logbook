"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { eur, minutesToHoursMinutes } from "@/lib/utils";
import type { PaymentFormValues } from "@/lib/payment-form";

type PaymentFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  currentBalance: number;
  rentalRatePerHour: number;
  instructorRatePerHour: number;
  initialValues?: Partial<PaymentFormValues>;
  movementId?: string;
  submitLabel?: string;
};

function buildInitialValues(
  initialValues?: Partial<PaymentFormValues>
): PaymentFormValues {
  return {
    movementType: initialValues?.movementType ?? "TOPUP",
    date: initialValues?.date ?? new Date().toISOString().slice(0, 10),
    amount: initialValues?.amount ?? "",
    notes: initialValues?.notes ?? "",
  };
}

export default function PaymentForm({
  mode,
  action,
  currentBalance,
  rentalRatePerHour,
  instructorRatePerHour,
  initialValues,
  movementId,
  submitLabel,
}: PaymentFormProps) {
  const initial = buildInitialValues(initialValues);

  const [movementType, setMovementType] = useState<"TOPUP" | "SERVICE">(
    initial.movementType
  );
  const [date, setDate] = useState(initial.date);
  const [amount, setAmount] = useState(initial.amount);
  const [notes, setNotes] = useState(initial.notes);

  const amountNumber = Number(amount || 0);
  const normalizedAmount = Number.isFinite(amountNumber) ? amountNumber : 0;

  const estimatedBalance = useMemo(
    () => currentBalance + normalizedAmount,
    [currentBalance, normalizedAmount]
  );

  const estimatedPicMinutes = useMemo(() => {
    if (estimatedBalance <= 0 || rentalRatePerHour <= 0) return 0;
    return (estimatedBalance / rentalRatePerHour) * 60;
  }, [estimatedBalance, rentalRatePerHour]);

  const estimatedInstructorMinutes = useMemo(() => {
    const fullRate = rentalRatePerHour + instructorRatePerHour;
    if (estimatedBalance <= 0 || fullRate <= 0) return 0;
    return (estimatedBalance / fullRate) * 60;
  }, [estimatedBalance, rentalRatePerHour, instructorRatePerHour]);

  const effectiveSubmitLabel =
    submitLabel ?? (mode === "edit" ? "Salva modifiche" : "Salva");

  return (
    <div className="grid grid-2">
      <div className="card">
        <form action={action} className="grid">
          {mode === "edit" && movementId ? (
            <input type="hidden" name="movementId" value={movementId} />
          ) : null}

          <div className="field">
            <label htmlFor="movementType">Tipologia pagamento</label>
            <select
              className="select"
              id="movementType"
              name="movementType"
              value={movementType}
              onChange={(e) =>
                setMovementType(e.target.value as "TOPUP" | "SERVICE")
              }
            >
              <option value="TOPUP">Ricarica credito</option>
              <option value="SERVICE">Pagamento servizio</option>
            </select>
          </div>

          <div className="field">
            <label htmlFor="date">Data</label>
            <input
              id="date"
              name="date"
              type="date"
              className="input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="amount">Importo</label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              className="input"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="notes">Note</label>
            <textarea
              id="notes"
              name="notes"
              className="textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="'Ricarica credito' / 'Rettifica saldo precedente' / 'Pagamento servizio'"
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button type="submit" className="btn">
              {effectiveSubmitLabel}
            </button>

            <Link href="/dashboard" className="btn secondary">
              Annulla
            </Link>
          </div>
        </form>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Previsione saldo</h3>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Saldo attuale</div>
          <div className="big-number">{eur(currentBalance)}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Nuovo saldo stimato</div>
          <div className="big-number">{eur(estimatedBalance)}</div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="muted">Nuove ore disponibili stimate</div>
          <div style={{ marginTop: 8 }}>
            PIC:{" "}
            {estimatedBalance > 0
              ? minutesToHoursMinutes(estimatedPicMinutes)
              : "0:00"}
          </div>
          <div style={{ marginTop: 4 }}>
            Istruttore:{" "}
            {estimatedBalance > 0
              ? minutesToHoursMinutes(estimatedInstructorMinutes)
              : "0:00"}
          </div>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Calcolato usando le tariffe correnti: noleggio {eur(rentalRatePerHour)}
          /h, istruttore {eur(instructorRatePerHour)}/h.
        </p>
      </div>
    </div>
  );
}