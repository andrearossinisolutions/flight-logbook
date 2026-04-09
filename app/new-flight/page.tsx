"use client";

import { AppShell } from "@/components/app-shell";
import { formatDateInput } from "@/lib/utils";
import { useMemo, useState } from "react";

export default function NewFlightPage() {
  const [inputMode, setInputMode] = useState<"HOBBS" | "MANUAL">("HOBBS");
  const [rentalRate, setRentalRate] = useState(150);
  const [instructorRate, setInstructorRate] = useState(80);
  const [instructorName, setInstructorName] = useState("");
  const [hobbsStartHours, setHobbsStartHours] = useState("");
  const [hobbsStartMinutes, setHobbsStartMinutes] = useState("0");
  const [hobbsEndHours, setHobbsEndHours] = useState("");
  const [hobbsEndMinutes, setHobbsEndMinutes] = useState("0");
  const [manualHours, setManualHours] = useState("0");
  const [manualMinutes, setManualMinutes] = useState("0");

  const durationMinutes = useMemo(() => {
    if (inputMode === "HOBBS") {
      const sh = Number(hobbsStartHours || 0);
      const sm = Number(hobbsStartMinutes || 0);
      const eh = Number(hobbsEndHours || 0);
      const em = Number(hobbsEndMinutes || 0);
      return Math.max(0, eh * 60 + em - (sh * 60 + sm));
    }

    return Number(manualHours || 0) * 60 + Number(manualMinutes || 0);
  }, [hobbsEndHours, hobbsEndMinutes, hobbsStartHours, hobbsStartMinutes, inputMode, manualHours, manualMinutes]);

  const totalCost = useMemo(() => {
    const base = (durationMinutes / 60) * rentalRate;
    const instructor = instructorName.trim() ? (durationMinutes / 60) * instructorRate : 0;
    return base + instructor;
  }, [durationMinutes, instructorName, instructorRate, rentalRate]);

  return (
    <AppShell title="Nuovo volo" subtitle="Durata da orametro o inserimento manuale; costo calcolato automaticamente.">
      <div className="grid grid-2">
        <div className="card">
          <form action="/api/movements/flight" method="post" className="grid">
            <div className="field">
              <label htmlFor="date">Data</label>
              <input className="input" id="date" name="date" type="date" defaultValue={formatDateInput(new Date())} required />
            </div>

            <div className="field">
              <label htmlFor="aircraft">Aeromobile</label>
              <input className="input" id="aircraft" name="aircraft" defaultValue="P92" required />
            </div>

            <div className="field">
              <label htmlFor="inputMode">Modalità durata</label>
              <select
                className="select"
                id="inputMode"
                name="inputMode"
                value={inputMode}
                onChange={(e) => setInputMode(e.target.value as "HOBBS" | "MANUAL")}
              >
                <option value="HOBBS">Da orametro</option>
                <option value="MANUAL">Manuale</option>
              </select>
            </div>

            {inputMode === "HOBBS" ? (
              <>
                <div className="grid grid-2">
                  <div className="field">
                    <label>Orametro partenza — ore</label>
                    <input className="input" name="hobbsStartHours" type="number" min="0" value={hobbsStartHours} onChange={(e) => setHobbsStartHours(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label>Orametro partenza — minuti</label>
                    <input className="input" name="hobbsStartMinutes" type="number" min="0" max="59" value={hobbsStartMinutes} onChange={(e) => setHobbsStartMinutes(e.target.value)} required />
                  </div>
                </div>
                <div className="grid grid-2">
                  <div className="field">
                    <label>Orametro arrivo — ore</label>
                    <input className="input" name="hobbsEndHours" type="number" min="0" value={hobbsEndHours} onChange={(e) => setHobbsEndHours(e.target.value)} required />
                  </div>
                  <div className="field">
                    <label>Orametro arrivo — minuti</label>
                    <input className="input" name="hobbsEndMinutes" type="number" min="0" max="59" value={hobbsEndMinutes} onChange={(e) => setHobbsEndMinutes(e.target.value)} required />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-2">
                <div className="field">
                  <label>Ore volo</label>
                  <input className="input" name="manualHours" type="number" min="0" value={manualHours} onChange={(e) => setManualHours(e.target.value)} required />
                </div>
                <div className="field">
                  <label>Minuti volo</label>
                  <input className="input" name="manualMinutes" type="number" min="0" max="59" value={manualMinutes} onChange={(e) => setManualMinutes(e.target.value)} required />
                </div>
              </div>
            )}

            <div className="field">
              <label htmlFor="instructorName">Istruttore (opzionale)</label>
              <input className="input" id="instructorName" name="instructorName" value={instructorName} onChange={(e) => setInstructorName(e.target.value)} />
            </div>

            <div className="field">
              <label htmlFor="notes">Note</label>
              <textarea className="textarea" id="notes" name="notes" />
            </div>

            <button className="btn" type="submit">Salva volo</button>
          </form>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Anteprima costo</h3>
          <div className="grid">
            <div className="field">
              <label>Tariffa noleggio usata nell’anteprima</label>
              <input className="input" type="number" value={rentalRate} min="0" step="0.01" onChange={(e) => setRentalRate(Number(e.target.value))} />
            </div>
            <div className="field">
              <label>Tariffa istruttore usata nell’anteprima</label>
              <input className="input" type="number" value={instructorRate} min="0" step="0.01" onChange={(e) => setInstructorRate(Number(e.target.value))} />
            </div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="muted">Durata calcolata</div>
            <div className="big-number">{Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m</div>
          </div>
          <div style={{ marginTop: 16 }}>
            <div className="muted">Costo stimato</div>
            <div className="big-number">€ {totalCost.toFixed(2)}</div>
          </div>
          <p className="muted" style={{ marginTop: 16 }}>
            Al salvataggio vengono usate le tariffe salvate nei settings dell’utente, e quelle tariffe vengono storicizzate sul volo.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
