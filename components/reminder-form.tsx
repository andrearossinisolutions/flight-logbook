"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import type { ReminderFormValues } from "@/lib/reminder-form";
import { SubmitButton } from "./submit-button";

type ReminderFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  initialValues?: Partial<ReminderFormValues>;
  movementId?: string;
  submitLabel?: string;
};

function buildInitialValues(initialValues?: Partial<ReminderFormValues>): ReminderFormValues {
  return {
    date: initialValues?.date ?? new Date().toISOString().slice(0, 10),
    time: initialValues?.time ?? "12:00",
    hasTime: initialValues?.hasTime ?? false,
    notes: initialValues?.notes ?? "",
  };
}

export default function ReminderForm({
  mode,
  action,
  initialValues,
  movementId,
  submitLabel,
}: ReminderFormProps) {
  const initial = buildInitialValues(initialValues);

  const [date, setDate] = useState(initial.date);
  const [hasTime, setHasTime] = useState(initial.hasTime);
  const [time, setTime] = useState(initial.time);
  const [notes, setNotes] = useState(initial.notes);

  const effectiveSubmitLabel = useMemo(() => {
    if (submitLabel) return submitLabel;
    return mode === "create" ? "Salva promemoria" : "Salva modifiche";
  }, [mode, submitLabel]);

  return (
    <div className="grid grid-2">
      <div className="card">
        <form action={action} className="grid">
          {mode === "edit" && movementId ? (
            <input type="hidden" name="movementId" value={movementId} />
          ) : null}

          {/* Date Input */}
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

          {/* Time Checkbox Toggle */}
          <div className="field" style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
            <input
              id="hasTime"
              name="hasTime"
              type="checkbox"
              style={{ width: "18px", height: "18px", cursor: "pointer" }}
              checked={hasTime}
              onChange={(e) => setHasTime(e.target.checked)}
            />
            <label htmlFor="hasTime" style={{ cursor: "pointer", fontSize: "0.95rem", fontWeight: 600 }}>
              Specifica un orario per il promemoria
            </label>
          </div>

          {/* Time Input (Conditional) */}
          {hasTime && (
            <div className="field" style={{ animation: "fadeInUp 0.3s ease forwards" }}>
              <label htmlFor="time">Ora</label>
              <input
                id="time"
                name="time"
                type="time"
                className="input"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required={hasTime}
              />
            </div>
          )}

          {/* Description Textarea */}
          <div className="field">
            <label htmlFor="notes">Descrizione promemoria</label>
            <textarea
              id="notes"
              name="notes"
              className="textarea"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Inserisci la descrizione o i dettagli del promemoria (es: Scadenza assicurazione aereo, Visita medica di rinnovo, Assemblea soci...)"
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="row" style={{ gap: 12, marginTop: 8 }}>
            <SubmitButton>
              {effectiveSubmitLabel}
            </SubmitButton>

            <Link href="/logbook" className="btn secondary">
              Annulla
            </Link>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "12px" }}>
          <span style={{ fontSize: "3rem" }}>🔔</span>
          <h3 style={{ marginTop: 12, marginBottom: 8, color: "var(--primary-strong)" }}>Come funzionano i Promemoria?</h3>
          <p className="muted" style={{ lineHeight: 1.5, fontSize: "0.95rem" }}>
            I promemoria non sono transazioni finanziarie e non influiscono sul tuo saldo. 
            Vengono mostrati nel registro movimenti in ordine cronologico.
          </p>
          <p className="muted" style={{ lineHeight: 1.5, fontSize: "0.95rem", marginTop: 12 }}>
            <strong>Notifiche Email:</strong> Il giorno stesso in cui scade il promemoria, all'orario indicato (o la mattina se non è stato specificato un orario),
            riceverai una notifica email automatica contenente tutti i dettagli impostati.
          </p>
        </div>
      </div>
    </div>
  );
}
