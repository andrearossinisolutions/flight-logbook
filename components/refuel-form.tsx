"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "./submit-button";

type AircraftOption = {
  id: string;
  label: string;
  tanksMax: number;
  aircraftMax: number;
  lastTanksAfter: number | null;
  lastAircraftAfter: number | null;
};

type RefuelFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  aircrafts: AircraftOption[];
  defaultDateTime: string;
};

function toNum(value: string): number | null {
  const text = value.trim().replace(",", ".");
  if (text === "") return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

export default function RefuelForm({ action, aircrafts, defaultDateTime }: RefuelFormProps) {
  const [aircraftId, setAircraftId] = useState(aircrafts.length === 1 ? aircrafts[0].id : "");
  const [tanksBefore, setTanksBefore] = useState("");
  const [tanksAfter, setTanksAfter] = useState("");
  const [aircraftBefore, setAircraftBefore] = useState("");
  const [aircraftAfter, setAircraftAfter] = useState("");

  const selected = aircrafts.find((a) => a.id === aircraftId);

  const tb = toNum(tanksBefore);
  const ta = toNum(tanksAfter);
  const ab = toNum(aircraftBefore);
  const aa = toNum(aircraftAfter);

  const warnings: string[] = [];
  if (tb !== null && ta !== null && ta > tb) {
    warnings.push("Le taniche «dopo» sono più piene di «prima»: di solito il rifornimento le svuota. Controlla i valori.");
  }
  if (ab !== null && aa !== null && aa < ab) {
    warnings.push("I litri dell'aereo «dopo» sono inferiori a «prima»: di solito il rifornimento li aumenta. Controlla i valori.");
  }

  return (
    <div className="card">
      <form action={action} className="grid">
        <div className="field">
          <label htmlFor="aircraftId">Aereo</label>
          <select
            className="select"
            id="aircraftId"
            name="aircraftId"
            value={aircraftId}
            onChange={(e) => setAircraftId(e.target.value)}
            required
          >
            {aircrafts.length !== 1 && <option value="">Seleziona un aereo</option>}
            {aircrafts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {selected && selected.lastTanksAfter !== null && selected.lastAircraftAfter !== null && (
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
              Ultimo stato registrato: taniche {selected.lastTanksAfter} L, aereo {selected.lastAircraftAfter} L.
            </div>
          )}
        </div>

        <div className="field">
          <label htmlFor="refueledAt">Data e ora</label>
          <input
            id="refueledAt"
            name="refueledAt"
            type="datetime-local"
            className="input"
            defaultValue={defaultDateTime}
            required
          />
        </div>

        <h3 style={{ margin: "8px 0 0" }}>Prima del rifornimento (L)</h3>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="tanksBeforeLiters">Disponibilità taniche (facoltativo)</label>
            <input
              id="tanksBeforeLiters"
              name="tanksBeforeLiters"
              type="number"
              inputMode="decimal"
              step="1"
              min="0"
              max={selected?.tanksMax}
              className="input"
              value={tanksBefore}
              onChange={(e) => setTanksBefore(e.target.value)}
              placeholder={selected ? `Max ${selected.tanksMax}` : undefined}
            />
          </div>
          <div className="field">
            <label htmlFor="aircraftBeforeLiters">Residuo serbatoi aereo (facoltativo)</label>
            <input
              id="aircraftBeforeLiters"
              name="aircraftBeforeLiters"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max={selected?.aircraftMax}
              className="input"
              value={aircraftBefore}
              onChange={(e) => setAircraftBefore(e.target.value)}
              placeholder={selected ? `Max ${selected.aircraftMax}` : undefined}
            />
          </div>
        </div>

        <h3 style={{ margin: "8px 0 0" }}>Dopo il rifornimento</h3>
        <div className="grid grid-2">
          <div className="field">
            <label htmlFor="tanksAfterLiters">Residuo taniche</label>
            <input
              id="tanksAfterLiters"
              name="tanksAfterLiters"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max={selected?.tanksMax}
              className="input"
              value={tanksAfter}
              onChange={(e) => setTanksAfter(e.target.value)}
              placeholder={selected ? `Max ${selected.tanksMax}` : undefined}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="aircraftAfterLiters">Serbatori aereo</label>
            <input
              id="aircraftAfterLiters"
              name="aircraftAfterLiters"
              type="number"
              inputMode="decimal"
              step="0.1"
              min="0"
              max={selected?.aircraftMax}
              className="input"
              value={aircraftAfter}
              onChange={(e) => setAircraftAfter(e.target.value)}
              placeholder={selected ? `Max ${selected.aircraftMax}` : undefined}
              required
            />
          </div>
        </div>

        {warnings.length > 0 && (
          <div
            style={{
              backgroundColor: "#fffbeb",
              border: "1px solid rgba(217, 119, 6, 0.2)",
              borderRadius: 12,
              padding: "10px 14px",
              color: "#b45309",
              fontSize: "0.85rem",
            }}
          >
            {warnings.map((w) => (
              <div key={w}>⚠️ {w}</div>
            ))}
          </div>
        )}

        <div className="row" style={{ gap: 12 }}>
          <SubmitButton>Salva rifornimento</SubmitButton>
          <Link href="/logbook" className="btn secondary">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
