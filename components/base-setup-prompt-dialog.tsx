"use client";

import { useState, useTransition } from "react";
import { dismissBasePromptAction, saveBaseFromPromptAction } from "@/app/base-prompt-actions";

export function BaseSetupPromptDialog({ suggestion }: { suggestion: string | null }) {
  const [base, setBase] = useState(suggestion ?? "");
  const [open, setOpen] = useState(true);
  const [pending, startTransition] = useTransition();

  if (!open) return null;

  return (
    <div
      className="no-print"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(20, 32, 51, 0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div className="card" style={{ maxWidth: 460, width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
        <h2 style={{ margin: 0 }}>🏠 Imposta la tua base di volo</h2>
        <p className="muted" style={{ margin: 0 }}>
          Con una base impostata ricevi via email il meteo del weekend (volabilità entro 100 km), il
          luogo di partenza dei nuovi voli viene precompilato e la base compare sulla mappa dei voli.
        </p>
        {suggestion ? (
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            Dal tuo logbook decolli di solito da <strong>{suggestion}</strong>.
          </p>
        ) : null}
        <input
          className="input"
          value={base}
          onChange={(e) => setBase(e.target.value)}
          placeholder="Es. LIML oppure Dovera"
          maxLength={100}
        />
        <div className="row" style={{ gap: 8, justifyContent: "flex-end" }}>
          <button
            className="btn secondary"
            type="button"
            disabled={pending}
            onClick={() => {
              setOpen(false);
              startTransition(() => dismissBasePromptAction());
            }}
          >
            Più tardi
          </button>
          <button
            className="btn"
            type="button"
            disabled={pending || !base.trim()}
            onClick={() => {
              setOpen(false);
              startTransition(() => saveBaseFromPromptAction(base));
            }}
          >
            Salva base
          </button>
        </div>
      </div>
    </div>
  );
}
