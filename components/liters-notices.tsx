"use client";

import { useRef, useState, type ReactNode } from "react";
import { capLiters } from "@/lib/fuel";

const amberBox = {
  backgroundColor: "#fffbeb",
  border: "1px solid rgba(217, 119, 6, 0.2)",
  borderRadius: 12,
  padding: "10px 14px",
  color: "#b45309",
  fontSize: "0.85rem",
} as const;

type CapNotice = { field: string; label: string; from: string; to: string };

/**
 * Correzione automatica di un singolo valore oltre il suo limite (entro tolleranza).
 * Scatta solo al blur del campo; dopo "Annulla" non ricorregge finché il campo non viene modificato.
 */
export function useCapFix() {
  const [notices, setNotices] = useState<CapNotice[]>([]);
  const skip = useRef<Set<string>>(new Set());

  function onBlurCap(field: string, label: string, text: string, capacity: number, set: (v: string) => void) {
    if (skip.current.has(field)) return;
    const n = text.trim() === "" ? null : Number(text.trim().replace(",", "."));
    const r = capLiters(n !== null && Number.isFinite(n) ? n : null, capacity);
    if (r.kind !== "capped") return;
    const to = String(r.value);
    set(to);
    setNotices((prev) => [...prev.filter((x) => x.field !== field), { field, label, from: text, to }]);
  }

  /** Da chiamare nell'onChange del campo: riabilita la correzione e toglie l'avviso. */
  function edited(field: string) {
    skip.current.delete(field);
    setNotices((prev) => (prev.some((x) => x.field === field) ? prev.filter((x) => x.field !== field) : prev));
  }

  function undo(notice: CapNotice, set: (v: string) => void) {
    skip.current.add(notice.field);
    set(notice.from);
    setNotices((prev) => prev.filter((x) => x.field !== notice.field));
  }

  return { notices, onBlurCap, edited, undo };
}

/** Avvisi ambra delle correzioni automatiche, con "Annulla". `setters` mappa il campo al suo setter. */
export function CapNotices({
  notices,
  undo,
  setters,
}: {
  notices: CapNotice[];
  undo: (n: CapNotice, set: (v: string) => void) => void;
  setters: Record<string, (v: string) => void>;
}) {
  if (notices.length === 0) return null;
  return (
    <div style={amberBox}>
      {notices.map((n) => (
        <div key={n.field} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>
            ⚠️ {n.label}: {n.from} L superava il massimo, l&apos;ho portato a {n.to} L.
          </span>
          <button type="button" className="btn secondary" onClick={() => undo(n, setters[n.field])}>
            Annulla
          </button>
        </div>
      ))}
    </div>
  );
}

/** Pannello «Qualcosa non torna»: correzioni pronte con i valori risultanti e «Modifico io». */
export function MismatchPanel({
  message,
  options,
  onDismiss,
}: {
  message: ReactNode;
  options: Array<{ label: string; apply: () => void }>;
  onDismiss: () => void;
}) {
  return (
    <div style={amberBox}>
      <div style={{ fontWeight: 600 }}>Qualcosa non torna</div>
      <div style={{ marginTop: 2 }}>{message}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
        {options.map((o) => (
          <button key={o.label} type="button" className="btn secondary" onClick={o.apply}>
            {o.label}
          </button>
        ))}
        <button type="button" className="btn secondary" onClick={onDismiss}>
          Modifico io
        </button>
      </div>
    </div>
  );
}
