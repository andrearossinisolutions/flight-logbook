"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { eur, formatDateDisplay, minutesToHoursMinutes } from "@/lib/utils";

type NewTopupFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  currentBalance: number;
  rentalRatePerHour: number;
  instructorRatePerHour: number;
};

export default function NewTopupForm({
  action,
  currentBalance,
  rentalRatePerHour,
  instructorRatePerHour,
}: NewTopupFormProps) {
  const [amount, setAmount] = useState("");

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

  return (
    <div className="grid grid-2">
      <div className="card">
        <form action={action} className="grid">
          <div className="field">
            <label htmlFor="date">Data</label>
            <input
              id="date"
              name="date"
              type="date"
              className="input"
              defaultValue={new Date().toISOString().slice(0, 10)}
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
              placeholder="'Ricarica credito' / 'Rettifica saldo precedente' / 'Ricarica per volo del...'"
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button type="submit" className="btn">
              Salva
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
          <div style={{ fontWeight: 700, marginTop: 8 }}>
            PIC: {estimatedBalance > 0 ? minutesToHoursMinutes(estimatedPicMinutes) : "0:00"}
          </div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>
            Istruttore:{" "}
            {estimatedBalance > 0
              ? minutesToHoursMinutes(estimatedInstructorMinutes)
              : "0:00"}
          </div>
        </div>

        <p className="muted" style={{ marginTop: 16 }}>
          Calcolato usando le tariffe correnti:
          {" "}
          noleggio {eur(rentalRatePerHour)}/h,
          {" "}
          istruttore {eur(instructorRatePerHour)}/h.
        </p>
      </div>
    </div>
  );
}