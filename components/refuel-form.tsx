"use client";

import Link from "next/link";
import { useState } from "react";
import { SubmitButton } from "./submit-button";
import { suggestedFuelExpense, roundLiters, litersTolerance } from "@/lib/fuel";
import { CapNotices, MismatchPanel, useCapFix } from "./liters-notices";

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
  // Totale in hangar forzato dall'utente (null = automatico, somma prima + aggiunti)
  const [totalForced, setTotalForced] = useState<string | null>(null);
  // Pannelli «Qualcosa non torna» chiusi con «Modifico io»: tornano solo se cambiano i valori
  const [dismissed, setDismissed] = useState<Record<string, string>>({});
  const capFix = useCapFix();

  const selected = aircrafts.find((a) => a.id === aircraftId);

  const tb = toNum(tanksBefore);
  const ta = toNum(tanksAfter);
  const aircraftBefore = aircraftBeforeEdit ?? (selected && selected.lastAircraftAfter !== null ? String(selected.lastAircraftAfter) : "");
  const ab = toNum(aircraftBefore);
  const aa = toNum(aircraftAfter);

  const isTanks = kind === "TANKS";
  const filledNum = toNum(filled);
  const tkBeforeBase = tkBeforeEdit ?? (selected && selected.lastTanksAfter !== null ? String(selected.lastTanksAfter) : "");
  // Totale forzato: è il riferimento e "prima" si ricalcola (totale - aggiunti); i litri aggiunti non si toccano
  const forcedTotalNum = totalForced !== null ? toNum(totalForced) : null;
  const forcing = forcedTotalNum !== null && filledNum !== null;
  const totalBelowAdded = forcing && forcedTotalNum < filledNum;
  const tkBeforeText = forcing && !totalBelowAdded ? String(roundLiters(forcedTotalNum - filledNum)) : tkBeforeBase;
  const tkBefore = toNum(tkBeforeText);
  const total =
    forcedTotalNum !== null
      ? roundLiters(forcedTotalNum)
      : tkBefore !== null && filledNum !== null
        ? roundLiters(tkBefore + filledNum)
        : null;
  const totalText = totalForced ?? (total !== null ? String(total) : "");
  const beforeCorrected = forcing && !totalBelowAdded && toNum(tkBeforeBase) !== null && toNum(tkBeforeBase) !== tkBefore;
  const overCapacity = !!selected && total !== null && total > selected.tanksMax;
  const suggestedPrice = selected ? suggestedFuelExpense(filledNum, selected.fuelPricePerLiter) : null;
  const priceText = priceEdit ?? (suggestedPrice !== null ? suggestedPrice.toFixed(2) : "");
  const priceNum = toNum(priceText);
  const canExpense = !!selected?.disableSharedFund;
  const addExpense = canExpense && (expenseOverride ?? (filledNum !== null && filledNum > 0));
  const expenseInvalid = addExpense && !(priceNum !== null && priceNum > 0);
  const tanksInvalid =
    isTanks && (tkBefore === null || totalBelowAdded || !(filledNum !== null && filledNum > 0) || overCapacity || expenseInvalid);

  const warnings: string[] = [];
  // Travaso che non torna (taniche scese di X, serbatoio salito di Y): solo avviso
  if (!isTanks && tb !== null && ta !== null && ab !== null && aa !== null && ta <= tb && aa >= ab) {
    const moved = roundLiters(tb - ta);
    const added = roundLiters(aa - ab);
    if (Math.abs(moved - added) > litersTolerance(selected?.aircraftMax ?? 0)) {
      warnings.push(
        `Le taniche sono scese di ${moved} L ma i serbatoi dell'aereo sono saliti di ${added} L: controlla i valori.`
      );
    }
  }

  // Relazioni che non tornano: nessuna scelta automatica, solo correzioni pronte
  const showPanel = (id: string, key: string) => dismissed[id] !== key;
  const dismiss = (id: string, key: string) => setDismissed((d) => ({ ...d, [id]: key }));
  const tanksKey = `${tkBeforeText}|${filled}`;
  const tanksPanel =
    isTanks && totalForced === null && selected && overCapacity && tkBefore !== null && tkBefore <= selected.tanksMax && filledNum !== null && filledNum > 0 && showPanel("tanks", tanksKey);
  const reduceTo = selected && tkBefore !== null ? roundLiters(selected.tanksMax - tkBefore) : 0;
  const tanksUpKey = `${tanksBefore}|${tanksAfter}`;
  const tanksUpPanel = !isTanks && tb !== null && ta !== null && ta > tb && showPanel("tanksUp", tanksUpKey);
  const airDownKey = `${aircraftBefore}|${aircraftAfter}`;
  const airDownPanel = !isTanks && ab !== null && aa !== null && aa < ab && showPanel("airDown", airDownKey);

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
              setTotalForced(null);
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
                  onChange={(e) => {
                    capFix.edited("tkBefore");
                    setTotalForced(null); // modifica a mano di "prima": il totale torna automatico
                    setTkBeforeEdit(e.target.value);
                  }}
                  onBlur={() => selected && !forcing && capFix.onBlurCap("tkBefore", "Litri nelle taniche prima", tkBeforeText, selected.tanksMax, setTkBeforeEdit)}
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
              <div className="field">
                <label htmlFor="tanksTotal">Totale in hangar dopo (L, max {selected.tanksMax})</label>
                <input
                  id="tanksTotal"
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  className="input"
                  value={totalText}
                  onChange={(e) => {
                    capFix.edited("tkTotal");
                    setTotalForced(e.target.value);
                  }}
                  onBlur={() =>
                    totalForced !== null && capFix.onBlurCap("tkTotal", "Totale in hangar", totalForced, selected.tanksMax, setTotalForced)
                  }
                />
                <span style={{ fontSize: 12, marginTop: 4, color: overCapacity || totalBelowAdded ? "#dc2626" : undefined }}>
                  {totalBelowAdded
                    ? "Il totale non può essere minore dei litri aggiunti."
                    : overCapacity
                      ? "Supera la capacità delle taniche."
                      : totalForced === null
                        ? "Calcolato come prima + aggiunti."
                        : "Totale impostato a mano: «prima» si ricalcola."}
                  {totalForced !== null && (
                    <>
                      {" "}
                      <button type="button" className="btn secondary" onClick={() => setTotalForced(null)}>
                        Ricalcola dalla somma
                      </button>
                    </>
                  )}
                </span>
              </div>
            )}
            {beforeCorrected && (
              <div
                style={{
                  backgroundColor: "#fffbeb",
                  border: "1px solid rgba(217, 119, 6, 0.2)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "#b45309",
                  fontSize: "0.85rem",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span>
                  ⚠️ Taniche prima corretto da {tkBeforeBase} a {tkBeforeText} L perché il totale è {total} L.
                </span>
                <button type="button" className="btn secondary" onClick={() => setTotalForced(null)}>
                  Annulla
                </button>
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
              onChange={(e) => {
                capFix.edited("tanksBefore");
                setTanksBefore(e.target.value);
              }}
              onBlur={() => selected && capFix.onBlurCap("tanksBefore", "Disponibilità taniche prima", tanksBefore, selected.tanksMax, setTanksBefore)}
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
              onChange={(e) => {
                capFix.edited("aircraftBefore");
                setAircraftBeforeEdit(e.target.value);
              }}
              onBlur={() => selected && capFix.onBlurCap("aircraftBefore", "Residuo serbatoi aereo prima", aircraftBefore, selected.aircraftMax, setAircraftBeforeEdit)}
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
              onChange={(e) => {
                capFix.edited("tanksAfter");
                setTanksAfter(e.target.value);
              }}
              onBlur={() => selected && capFix.onBlurCap("tanksAfter", "Residuo taniche dopo", tanksAfter, selected.tanksMax, setTanksAfter)}
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
              onChange={(e) => {
                capFix.edited("aircraftAfter");
                setAircraftAfter(e.target.value);
              }}
              onBlur={() => selected && capFix.onBlurCap("aircraftAfter", "Serbatoi aereo dopo", aircraftAfter, selected.aircraftMax, setAircraftAfter)}
              placeholder={selected ? `Max ${selected.aircraftMax}` : undefined}
              required
            />
          </div>
        </div>

          </>
        )}

        <CapNotices
          notices={capFix.notices}
          undo={capFix.undo}
          setters={{
            tkBefore: setTkBeforeEdit,
            tkTotal: setTotalForced as (v: string) => void,
            tanksBefore: setTanksBefore,
            aircraftBefore: setAircraftBeforeEdit,
            tanksAfter: setTanksAfter,
            aircraftAfter: setAircraftAfter,
          }}
        />

        {tanksPanel && selected && (
          <MismatchPanel
            message={`${tkBeforeText} L + ${filled} L = ${total} L, ma le taniche contengono al massimo ${selected.tanksMax} L.`}
            options={[
              ...(filledNum !== null && filledNum <= selected.tanksMax
                ? [
                    {
                      label: `Totale = capacità (${selected.tanksMax} L): taniche prima → ${roundLiters(selected.tanksMax - filledNum)} L`,
                      apply: () => setTotalForced(String(selected.tanksMax)),
                    },
                  ]
                : []),
              ...(reduceTo > 0
                ? [{ label: `Aggiunti → ${reduceTo} L (totale ${selected.tanksMax} L)`, apply: () => setFilled(String(reduceTo)) }]
                : []),
            ]}
            onDismiss={() => dismiss("tanks", tanksKey)}
          />
        )}
        {tanksUpPanel && (
          <MismatchPanel
            message="Le taniche «dopo» sono più piene di «prima»: di solito il rifornimento le svuota."
            options={[
              { label: `Taniche prima = ${ta} L`, apply: () => setTanksBefore(String(ta)) },
              { label: `Taniche dopo = ${tb} L`, apply: () => setTanksAfter(String(tb)) },
            ]}
            onDismiss={() => dismiss("tanksUp", tanksUpKey)}
          />
        )}
        {airDownPanel && (
          <MismatchPanel
            message="I litri dell'aereo «dopo» sono inferiori a «prima»: di solito il rifornimento li aumenta."
            options={[
              { label: `Aereo prima = ${aa} L`, apply: () => setAircraftBeforeEdit(String(aa)) },
              { label: `Aereo dopo = ${ab} L`, apply: () => setAircraftAfter(String(ab)) },
            ]}
            onDismiss={() => dismiss("airDown", airDownKey)}
          />
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
