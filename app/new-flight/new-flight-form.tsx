"use client";

import { formatDateInput } from "@/lib/utils";
import { useMemo, useState } from "react";
import { minutesToHoursMinutes } from "@/lib/utils";

type NewFlightFormProps = {
  currentBalance: number;
  totalFlightMinutes: number;
};

export default function NewFlightForm({
  currentBalance,
  totalFlightMinutes,
}: NewFlightFormProps) {
  const [insertMode, setInsertMode] = useState<"PAST" | "FUTURE">("PAST");
  const [inputMode, setInputMode] = useState<"HOBBS" | "MANUAL">("HOBBS");
  const [routeMode, setRouteMode] = useState<"SINGLE" | "DOUBLE">("SINGLE");
  const [rentalRate, setRentalRate] = useState("150");
  const [instructorRate, setInstructorRate] = useState("80");
  const [instructorName, setInstructorName] = useState("");
  const [hobbsStartHours, setHobbsStartHours] = useState("0");
  const [hobbsStartMinutes, setHobbsStartMinutes] = useState("0");
  const [hobbsEndHours, setHobbsEndHours] = useState("0");
  const [hobbsEndMinutes, setHobbsEndMinutes] = useState("0");
  const [manualHours, setManualHours] = useState("0");
  const [manualMinutes, setManualMinutes] = useState("0");
  const [warmupMinutes, setWarmupMinutes] = useState("15");

  const durationMinutes = useMemo(() => {
    if (inputMode === "HOBBS") {
      const sh = Number(hobbsStartHours || 0);
      const sm = Number(hobbsStartMinutes || 0);
      const eh = Number(hobbsEndHours || 0);
      const em = Number(hobbsEndMinutes || 0);
      var d = Math.max(0, eh * 60 + em - (sh * 60 + sm)) + (insertMode === "FUTURE" ? Number(warmupMinutes || 0) : 0);

      return routeMode === "DOUBLE" ? d * 2 : d;
    }

    var d = Number(manualHours || 0) * 60 + Number(manualMinutes || 0) + (insertMode === "FUTURE" ? Number(warmupMinutes || 0) : 0);
    return routeMode === "DOUBLE" ? d * 2 : d;
  }, [
    hobbsEndHours,
    hobbsEndMinutes,
    hobbsStartHours,
    hobbsStartMinutes,
    inputMode,
    manualHours,
    manualMinutes,
    routeMode,
    warmupMinutes,
  ]);

  const rentalRateNumber = Number(rentalRate || 0);
  const instructorRateNumber = Number(instructorRate || 0);

  const totalCost = useMemo(() => {
    const base =
      (durationMinutes / 60) *
      (Number.isFinite(rentalRateNumber) ? rentalRateNumber : 0);

    const instructor = instructorName.trim()
      ? (durationMinutes / 60) *
        (Number.isFinite(instructorRateNumber) ? instructorRateNumber : 0)
      : 0;

    return base + instructor;
  }, [
    durationMinutes,
    instructorName,
    instructorRateNumber,
    rentalRateNumber,
  ]);

  const estimatedBalance = currentBalance - totalCost;

  return (
    <div className="grid grid-2">
      <form action="/api/movements/flight" method="post" className="grid">
        <div className="card">
          <div className="field">
            <div className="field">
              <label htmlFor="insertMode">Tipologia inserimento</label>
              <select
                className="select"
                id="insertMode"
                name="insertMode"
                value={insertMode}
                onChange={(e) => {
                  setInsertMode(e.target.value as "PAST" | "FUTURE");
                  setInputMode(e.target.value === "FUTURE" ? "MANUAL" : "HOBBS")
                }}
              >
                <option value="PAST">Volo passato</option>
                <option value="FUTURE">Pianificazione</option>
              </select>
            </div>

            <label htmlFor="date">Data</label>
            <input
              className="input"
              id="date"
              name="date"
              type="date"
              defaultValue={formatDateInput(new Date())}
              max={insertMode === "PAST" ? formatDateInput(new Date()) : undefined}
              min={insertMode === "FUTURE" ? formatDateInput(new Date()) : undefined}
              required
            />
          </div>

          <div className="grid grid-2">
            <div className="field" style={{ marginTop: "16px" }}>
              <label htmlFor="aircraftRegistration">Marche</label>
              <input
                className="input"
                id="aircraftRegistration"
                name="aircraftRegistration"
                defaultValue="I-4150"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="aircraftType">Tipo</label>
              <input
                className="input"
                id="aircraftType"
                name="aircraftType"
                defaultValue="P92"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="instructorName">Istruttore (opzionale)</label>
              <input
                className="input"
                id="instructorName"
                name="instructorName"
                value={instructorName}
                onChange={(e) => setInstructorName(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tempi</h3>

          { insertMode === "PAST" && <div className="field" style={{ marginBottom: "16px" }}>
            <label htmlFor="inputMode">Modalità durata</label>
            <select
              className="select"
              id="inputMode"
              name="inputMode"
              value={inputMode}
              onChange={(e) =>
                setInputMode(e.target.value as "HOBBS" | "MANUAL")
              }
            >
              <option value="HOBBS">Da orametro</option>
              <option value="MANUAL">Manuale</option>
            </select>
          </div> }

          { insertMode === "PAST" && inputMode === "HOBBS" ? (
            <>
              <div className="grid grid-2">
                <div className="field">
                  <label>Orametro partenza — ore</label>
                  <input
                    className="input"
                    name="hobbsStartHours"
                    type="number"
                    min="0"
                    value={hobbsStartHours}
                    onChange={(e) => setHobbsStartHours(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Orametro partenza — minuti</label>
                  <input
                    className="input"
                    name="hobbsStartMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={hobbsStartMinutes}
                    onChange={(e) => setHobbsStartMinutes(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field" style={{ marginTop: "16px" }}>
                  <label>Orametro arrivo — ore</label>
                  <input
                    className="input"
                    name="hobbsEndHours"
                    type="number"
                    min="0"
                    value={hobbsEndHours}
                    onChange={(e) => setHobbsEndHours(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>Orametro arrivo — minuti</label>
                  <input
                    className="input"
                    name="hobbsEndMinutes"
                    type="number"
                    min="0"
                    max="59"
                    value={hobbsEndMinutes}
                    onChange={(e) => setHobbsEndMinutes(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-2">
              { insertMode === "FUTURE" && <>
                <div className="field">
                  <label htmlFor="routeMode">Tipologia tratta</label>
                  <select
                    className="select"
                    id="routeMode"
                    name="routeMode"
                    value={routeMode}
                    onChange={(e) => 
                      setRouteMode(e.target.value as "SINGLE" | "DOUBLE")
                    }
                  >
                    <option value="SINGLE">Tratta singola</option>
                    <option value="DOUBLE">Tratta doppia (A / R)</option>
                  </select>
                </div>

                <div className="field">
                  <label>Riscaldamento motore</label>
                  <input
                    className="input"
                    name="warmupMinutes"
                    type="number"
                    min="0"
                    value={warmupMinutes}
                    onChange={(e) => setWarmupMinutes(e.target.value)}
                    required
                  />
                </div>
              </> }

              <div className="field">
                <label>Ore volo</label>
                <input
                  className="input"
                  name="manualHours"
                  type="number"
                  min="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Minuti volo</label>
                <input
                  className="input"
                  name="manualMinutes"
                  type="number"
                  min="0"
                  max="59"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(e.target.value)}
                  required
                />
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Costi</h3>

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="rentalRateApplied">
                Tariffa noleggio applicata (€/h)
              </label>
              <input
                className="input"
                id="rentalRateApplied"
                name="rentalRateApplied"
                type="number"
                min="0"
                step="0.01"
                value={rentalRate}
                onChange={(e) => setRentalRate(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="instructorRateApplied">
                Tariffa istruttore applicata (€/h)
              </label>
              <input
                className="input"
                id="instructorRateApplied"
                name="instructorRateApplied"
                type="number"
                min="0"
                step="0.01"
                value={instructorRate}
                onChange={(e) => setInstructorRate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dettagli</h3>

          { insertMode === "PAST" ? <>
            <div className="field">
              <label htmlFor="notes">Note</label>
              <textarea className="textarea" id="notes" name="notes" />
            </div>

            <button className="btn" type="submit" style={{ marginTop: "16px" }}>
              Salva volo
            </button>
          </> : <p style={{ marginBottom: 0 }}>La pianificazione non può essere salvata, ma consente di avere un'anteprima immediata del costo stimato al variare dei parametri.</p> }
        </div>
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Anteprima costo</h3>

        <div className="grid">
          <div className="field">
            <label>Tariffa noleggio applicata</label>
            <div className="input" style={{ display: "flex", alignItems: "center" }}>
              €{" "}
              {Number.isFinite(rentalRateNumber)
                ? rentalRateNumber.toFixed(2)
                : "0.00"}
              /h
            </div>
          </div>

          <div className="field">
            <label>Tariffa istruttore applicata</label>
            <div className="input" style={{ display: "flex", alignItems: "center" }}>
              €{" "}
              {Number.isFinite(instructorRateNumber)
                ? instructorRateNumber.toFixed(2)
                : "0.00"}
              /h
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Durata calcolata</div>
          <div className="big-number">
            {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Costo {insertMode === "PAST" ? "del volo" : "stimato"}</div>
          <div className="big-number">€ {totalCost.toFixed(2)}</div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Nuovo saldo{insertMode === "PAST" ? "" : " stimato"}</div>
          <div className="big-number">€ {estimatedBalance.toFixed(2)}</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>
              Saldo attuale: € {currentBalance.toFixed(2)}.
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Nuove ore {insertMode === "PAST" ? "totali" : "stimate"}</div>
          <div className="big-number">{minutesToHoursMinutes(totalFlightMinutes + durationMinutes)}</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>
            Ore totali attuali: {minutesToHoursMinutes(totalFlightMinutes)}.
          </div>
        </div>
      </div>
    </div>
  );
}