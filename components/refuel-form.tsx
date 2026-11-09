"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "./submit-button";
import { suggestedFuelExpense } from "@/lib/fuel";

type AircraftOption = {
  id: string;
  label: string;
  tanksMax: number;
  aircraftMax: number;
  lastTanksAfter: number | null;
  lastAircraftAfter: number | null;
  lastAircraftAfterEstimated: boolean;
  fuelPricePerLiter: number;
  disableSharedFund: boolean;
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
  // "Aereo prima": valore toccato dall'utente (altrimenti precompilato con i litri a bordo del server)
  const [aircraftBeforeEdit, setAircraftBeforeEdit] = useState<string | null>(null);
  const [aircraftAfter, setAircraftAfter] = useState("");
  const [kind, setKind] = useState<"TANKS" | "AIRCRAFT">("TANKS");
  // Rifornimento taniche: valori toccati dall'utente (altrimenti precompilati dal server/prezzo)
  const [tkBeforeEdit, setTkBeforeEdit] = useState<string | null>(null);
  const [filled, setFilled] = useState("");
  const [priceEdit, setPriceEdit] = useState<string | null>(null);
  const [expenseOverride, setExpenseOverride] = useState<boolean | null>(null);

  const selected = aircrafts.find((a) => a.id === aircraftId);

  const tb = toNum(tanksBefore);
  const ta = toNum(tanksAfter);
  const aircraftBefore = aircraftBeforeEdit ?? (selected && selected.lastAircraftAfter !== null ? String(selected.lastAircraftAfter) : "");
  const ab = toNum(aircraftBefore);
  const aa = toNum(aircraftAfter);

  const isTanks = kind === "TANKS";
  const tkBeforeText = tkBeforeEdit ?? (selected && selected.lastTanksAfter !== null ? String(selected.lastTanksAfter) : "");
  const tkBefore = toNum(tkBeforeText);
  const filledNum = toNum(filled);
  const total = tkBefore !== null && filledNum !== null ? Math.round((tkBefore + filledNum) * 10) / 10 : null;
  const overCapacity = !!selected && total !== null && total > selected.tanksMax;
  const suggestedPrice = selected ? suggestedFuelExpense(filledNum, selected.fuelPricePerLiter) : null;
  const priceText = priceEdit ?? (suggestedPrice !== null ? suggestedPrice.toFixed(2) : "");
  const priceNum = toNum(priceText);
  const canExpense = !!selected?.disableSharedFund;
  const addExpense = canExpense && (expenseOverride ?? (filledNum !== null && filledNum > 0));
  const expenseInvalid = addExpense && !(priceNum !== null && priceNum > 0);
  const tanksInvalid =
    isTanks && (tkBefore === null || !(filledNum !== null && filledNum > 0) || overCapacity || expenseInvalid);

  const warnings: string[] = [];
  if (!isTanks && tb !== null && ta !== null && ta > tb) {
    warnings.push("Le taniche «dopo» sono più piene di «prima»: di solito il rifornimento le svuota. Controlla i valori.");
  }
  if (!isTanks && ab !== null && aa !== null && aa < ab) {
    warnings.push("I litri dell'aereo «dopo» sono inferiori a «prima»: di solito il rifornimento li aumenta. Controlla i valori.");
  }

  return (
    <div className="card">
      <form action={action} className="grid">
        <div className="field">
          <label htmlFor="kind">Tipologia rifornimento</label>
          <select
            className="select"
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as "TANKS" | "AIRCRAFT")}
          >
            <option value="TANKS">Rifornimento taniche</option>
            <option value="AIRCRAFT">Rifornimento aereo</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="aircraftId">Aereo</label>
          <select
            className="select"
            id="aircraftId"
            name="aircraftId"
            value={aircraftId}
            onChange={(e) => {
              setAircraftId(e.target.value);
              setTkBeforeEdit(null);
            }}
            required
          >
            {aircrafts.length !== 1 && <option value="">Seleziona un aereo</option>}
            {aircrafts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          {selected && !isTanks && selected.lastTanksAfter !== null && selected.lastAircraftAfter !== null && (
            <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
              Ultimo stato registrato: taniche {selected.lastTanksAfter} L, aereo {selected.lastAircraftAfter} L{selected.lastAircraftAfterEstimated ? " (stimato)" : ""}.
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

        {isTanks ? (
          <>
            <h3 style={{ margin: "8px 0 0" }}>Rifornimento taniche (L)</h3>
            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="tanksBeforeLiters">Litri nelle taniche prima</label>
                <input
                  id="tanksBeforeLiters"
                  name="tanksBeforeLiters"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  max={selected?.tanksMax}
                  className="input"
                  value={tkBeforeText}
                  onChange={(e) => setTkBeforeEdit(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="filledLiters">Litri aggiunti</label>
                <input
                  id="filledLiters"
                  name="filledLiters"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0.1"
                  className="input"
                  value={filled}
                  onChange={(e) => setFilled(e.target.value)}
                  required
                />
              </div>
            </div>
            {selected && (
              <div
                style={{ fontWeight: 600, color: overCapacity ? "#dc2626" : undefined }}
              >
                Totale in hangar: {total !== null ? `${total} L` : "—"} (max {selected.tanksMax} L)
                {overCapacity && " — supera la capacità delle taniche"}
              </div>
            )}
            <div className="field">
              <label htmlFor="pricePaid">Prezzo pagato (€ totale)</label>
              <input
                id="pricePaid"
                name="pricePaid"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                className="input"
                value={priceText}
                onChange={(e) => setPriceEdit(e.target.value)}
              />
            </div>
            {canExpense && (
              <div className="field">
                <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="checkbox"
                    name="addExpense"
                    checked={addExpense}
                    onChange={(e) => setExpenseOverride(e.target.checked)}
                  />
                  Aggiungi alle spese della società
                </label>
                {addExpense && (
                  <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                    Registrato come anticipo spesa per ore di volo, a tuo credito. Serve un prezzo pagato maggiore di zero.
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <>
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
            <label htmlFor="aircraftBeforeLiters">
              Residuo serbatoi aereo (facoltativo)
              {aircraftBeforeEdit === null && selected?.lastAircraftAfterEstimated && selected.lastAircraftAfter !== null ? " (stimato)" : ""}
            </label>
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
              onChange={(e) => setAircraftBeforeEdit(e.target.value)}
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

          </>
        )}

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
          <SubmitButton disabled={tanksInvalid}>Salva rifornimento</SubmitButton>
          <Link href="/logbook" className="btn secondary">
            Annulla
          </Link>
        </div>
      </form>
    </div>
  );
}
