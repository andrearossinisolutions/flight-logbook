"use client";

import { CopyArrowIcon } from "@/components/icons";
import Link from "next/link";
import { formatDateTimeInput, minutesToHoursMinutes } from "@/lib/utils";
import { useMemo, useState } from "react";
import type { FlightFormValues } from "@/lib/flight-form";

type FlightFormProps = {
  mode: "create" | "edit";
  action: (formData: FormData) => void | Promise<void>;
  currentBalance: number;
  totalFlightMinutes: number;
  dateBipoExam: Date | null;
  initialValues?: Partial<FlightFormValues>;
  movementId?: string;
  submitLabel?: string;
};

function buildInitialValues(
  initialValues?: Partial<FlightFormValues>
): FlightFormValues {
  return {
    date: initialValues?.date ?? formatDateTimeInput(new Date()),
    isDraft: initialValues?.isDraft ?? false,
    inputMode: initialValues?.inputMode ?? "HOBBS",
    routeMode: initialValues?.routeMode ?? "SINGLE",
    aircraftRegistration: initialValues?.aircraftRegistration ?? "I-4150",
    aircraftType: initialValues?.aircraftType ?? "P92",
    takeoffPlace: initialValues?.takeoffPlace ?? "",
    arrivalPlace: initialValues?.arrivalPlace ?? "",
    engineOn: initialValues?.engineOn ?? "",
    engineOff: initialValues?.engineOff ?? "",
    passengerName: initialValues?.passengerName ?? "",
    instructorName: initialValues?.instructorName ?? "",
    instructorMinutes: initialValues?.instructorMinutes ?? "",
    hobbsStartHours: initialValues?.hobbsStartHours ?? "",
    hobbsStartMinutes: initialValues?.hobbsStartMinutes ?? "",
    hobbsEndHours: initialValues?.hobbsEndHours ?? "",
    hobbsEndMinutes: initialValues?.hobbsEndMinutes ?? "",
    manualHours: initialValues?.manualHours ?? "",
    manualMinutes: initialValues?.manualMinutes ?? "",
    warmupMinutes: initialValues?.warmupMinutes ?? "15",
    rentalRateApplied: initialValues?.rentalRateApplied ?? "150",
    instructorRateApplied: initialValues?.instructorRateApplied ?? "80",
    notes: initialValues?.notes ?? "",
  };
}

export default function FlightForm({
  mode,
  action,
  currentBalance,
  totalFlightMinutes,
  dateBipoExam,
  initialValues,
  movementId,
}: FlightFormProps) {
  const initial = buildInitialValues(initialValues);

  const initialDate = new Date(initial.date);
  const initialIsTodayOrPastDateTime =
    !Number.isNaN(initialDate.getTime()) && initialDate <= new Date();
  const shouldAutoConfirmDraftFlight =
    mode === "edit" && initial.isDraft && initialIsTodayOrPastDateTime;

  const [insertMode, setInsertMode] = useState<"PAST" | "FUTURE">(
    shouldAutoConfirmDraftFlight ? "PAST" : initial.isDraft ? "FUTURE" : "PAST"
  );
  const [inputMode, setInputMode] = useState<"HOBBS" | "MANUAL">(
    shouldAutoConfirmDraftFlight ? "HOBBS" : initial.inputMode
  );
  const [routeMode, setRouteMode] = useState<"SINGLE" | "DOUBLE">(initial.routeMode);

  const [date, setDate] = useState(initial.date);
  const [aircraftRegistration, setAircraftRegistration] = useState(initial.aircraftRegistration);
  const [aircraftType, setAircraftType] = useState(initial.aircraftType);
  const [takeoffPlace, setTakeoffPlace] = useState(initial.takeoffPlace);
  const [arrivalPlace, setArrivalPlace] = useState(initial.arrivalPlace);
  const [engineOn, setEngineOn] = useState(initial.engineOn);
  const [engineOff, setEngineOff] = useState(initial.engineOff);

  const [rentalRate, setRentalRate] = useState(initial.rentalRateApplied);
  const [instructorRate, setInstructorRate] = useState(initial.instructorRateApplied);

  const [passengerName, setPassengerName] = useState(initial.passengerName);

  const [instructorName, setInstructorName] = useState(initial.instructorName);
  const [instructorMinutes, setInstructorMinutes] = useState(initial.instructorMinutes);

  const [hobbsStartHours, setHobbsStartHours] = useState(initial.hobbsStartHours);
  const [hobbsStartMinutes, setHobbsStartMinutes] = useState(initial.hobbsStartMinutes);
  const [hobbsEndHours, setHobbsEndHours] = useState(initial.hobbsEndHours);
  const [hobbsEndMinutes, setHobbsEndMinutes] = useState(initial.hobbsEndMinutes);

  const [manualHours, setManualHours] = useState(initial.manualHours);
  const [manualMinutes, setManualMinutes] = useState(initial.manualMinutes);

  const [warmupMinutes, setWarmupMinutes] = useState(initial.warmupMinutes);
  const [notes, setNotes] = useState(initial.notes);

  const durationMinutes = useMemo(() => {
    if (inputMode === "HOBBS") {
      const sh = Number(hobbsStartHours || 0);
      const sm = Number(hobbsStartMinutes || 0);
      const eh = Number(hobbsEndHours || 0);
      const em = Number(hobbsEndMinutes || 0);

      const base =
        Math.max(0, eh * 60 + em - (sh * 60 + sm)) +
        (insertMode === "FUTURE" ? Number(warmupMinutes || 0) : 0);

      return routeMode === "DOUBLE" ? base * 2 : base;
    }

    const base =
      Number(manualHours || 0) * 60 +
      Number(manualMinutes || 0) +
      (insertMode === "FUTURE" ? Number(warmupMinutes || 0) : 0);

    return routeMode === "DOUBLE" ? base * 2 : base;
  }, [
    hobbsEndHours,
    hobbsEndMinutes,
    hobbsStartHours,
    hobbsStartMinutes,
    inputMode,
    insertMode,
    manualHours,
    manualMinutes,
    routeMode,
    warmupMinutes,
  ]);

  const rentalRateNumber = Number(rentalRate || 0);
  const instructorRateNumber = Number(instructorRate || 0);
  const instructorMinutesNumber = Number(instructorMinutes || 0);

  const isTodayOrPastDateTime = useMemo(() => {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return false;
    }

    return parsedDate <= new Date();
  }, [date]);

  const totalCost = useMemo(() => {
    const base =
      (durationMinutes / 60) *
      (Number.isFinite(rentalRateNumber) ? rentalRateNumber : 0);

    const instructor = instructorMinutesNumber > 0 ?
      (durationMinutes / 60) *
      (Number.isFinite(instructorRateNumber) ? instructorRateNumber : 0) : 0;

    return base + instructor;
  }, [
    durationMinutes,
    instructorMinutesNumber,
    instructorRateNumber,
    rentalRateNumber,
  ]);

  const effectiveSubmitLabel = useMemo(() => {
    if (mode === "edit" && initial.isDraft && isTodayOrPastDateTime) {
      return "Conferma volo";
    }

    return mode === "edit"
      ? "Salva modifiche"
      : insertMode === "PAST"
        ? "Salva volo"
        : "Salva pianificazione"
  }, [initial.isDraft, insertMode, isTodayOrPastDateTime, mode]);

  return (
    <div className="grid grid-2">
      <form action={action} className="grid">
        {mode === "edit" && movementId ? (
          <input type="hidden" name="movementId" value={movementId} />
        ) : null}

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
                  const nextMode = e.target.value as "PAST" | "FUTURE";
                  setInsertMode(nextMode);
                  setInputMode(nextMode === "FUTURE" ? "MANUAL" : "HOBBS");
                }}
              >
                <option value="PAST">Volo passato</option>
                <option value="FUTURE">Pianificazione</option>
              </select>
            </div>

            <label htmlFor="date">Data e ora</label>
            <input
              className="input"
              id="date"
              name="date"
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={insertMode === "PAST" ? formatDateTimeInput(new Date()) : undefined}
              min={insertMode === "FUTURE" ? formatDateTimeInput(new Date()) : undefined}
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
                value={aircraftRegistration}
                onChange={(e) => setAircraftRegistration(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="aircraftType">Tipo</label>
              <input
                className="input"
                id="aircraftType"
                name="aircraftType"
                value={aircraftType}
                onChange={(e) => setAircraftType(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-2" style={{ marginTop: "16px" }}>
            <div className="field">
              <label htmlFor="takeoffPlace">Luogo decollo</label>
              <input
                className="input"
                id="takeoffPlace"
                name="takeoffPlace"
                value={takeoffPlace}
                onChange={(e) => setTakeoffPlace(e.target.value)}
                placeholder="Es. Dovera"
              />
            </div>

            <div className="field">
              <label htmlFor="arrivalPlace">Luogo arrivo</label>
              <div className="input-action">
                <input
                  className="input"
                  id="arrivalPlace"
                  name="arrivalPlace"
                  value={arrivalPlace}
                  onChange={(e) => setArrivalPlace(e.target.value)}
                  placeholder="Es. Dovera"
                />
                <button
                  className="btn secondary icon-btn"
                  type="button"
                  onClick={() => setArrivalPlace(takeoffPlace)}
                  aria-label="Copia il luogo di decollo nell'arrivo"
                  title="Volo locale"
                >
                  <CopyArrowIcon size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Tempi</h3>

          {insertMode === "PAST" && (
            <div className="field" style={{ marginBottom: "16px" }}>
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
          )}

          {insertMode === "PAST" && inputMode === "HOBBS" ? (
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
                    placeholder="Ore partenza"
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
                    placeholder="Minuti partenza"
                    onChange={(e) => setHobbsStartMinutes(e.target.value)}
                    required
                  />
                </div>

                <div className="field">
                  <label>Orametro arrivo — ore</label>
                  <input
                    className="input"
                    name="hobbsEndHours"
                    type="number"
                    min="0"
                    value={hobbsEndHours}
                    placeholder="Ore arrivo"
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
                    placeholder="Minuti arrivo"
                    onChange={(e) => setHobbsEndMinutes(e.target.value)}
                    required
                  />
                </div>
              </div>
            </>
          ) : (
            <div className="grid grid-2">
              {insertMode === "FUTURE" && (
                <>
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
                </>
              )}

              <div className="field">
                <label>Ore volo</label>
                <input
                  className="input"
                  name="manualHours"
                  type="number"
                  min="0"
                  value={manualHours}
                  onChange={(e) => setManualHours(e.target.value)}
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
                />
              </div>
            </div>
          )}

          {insertMode === "PAST" && <>
            <div className="grid grid-2" style={{ marginTop: "16px" }}>
              <div className="field">
                <label htmlFor="engineOn">Accensione motore</label>
                <input
                  className="input"
                  id="engineOn"
                  name="engineOn"
                  type="datetime-local"
                  value={engineOn}
                  onChange={(e) => setEngineOn(e.target.value)}
                />
              </div>

              <div className="field">
                <label htmlFor="engineOff">Spegnimento motore</label>
                <input
                  className="input"
                  id="engineOff"
                  name="engineOff"
                  type="datetime-local"
                  value={engineOff}
                  onChange={(e) => setEngineOff(e.target.value)}
                />
              </div>
            </div>
          </>}
        </div>

        <div className="card">
          <div className="grid grid-2">
            { dateBipoExam && <div className="field">
              <label htmlFor="passengerName">Passeggero</label>
              <input
                className="input"
                id="passengerName"
                name="passengerName"
                value={passengerName}
                onChange={(e) => {
                  setPassengerName(e.target.value)

                  if (e.target.value) {
                    setInstructorName("")
                    setInstructorMinutes("")
                  }
                }}
                placeholder="Nome passeggero (se presente)"
              />
            </div> }

            <div className="field">
              <label htmlFor="instructorName">Istruttore</label>
              <input
                className="input"
                id="instructorName"
                name="instructorName"
                value={instructorName}
                onChange={(e) => {
                  setInstructorName(e.target.value)

                  if (e.target.value) {
                    setPassengerName("")

                    if (!instructorMinutes) {
                      setInstructorMinutes(String(durationMinutes))
                    }
                  }
                }}
                placeholder="Nome istruttore (se presente)"
              />
            </div>

            <div className="field">
              <label>Minuti istruttore</label>
              <input
                className="input"
                name="instructorMinutes"
                type="number"
                min="0"
                max={durationMinutes}
                value={instructorMinutes}
                placeholder={durationMinutes > 0 ? `Tra 0 e ${durationMinutes} minuti` : "Inserisci prima un tempo di volo valido"}
                onChange={(e) => setInstructorMinutes(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Costi</h3>

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="rentalRateApplied">Tariffa noleggio applicata (€/h)</label>
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

          <div className="field">
            <label htmlFor="notes">Note</label>
            <textarea
              className="textarea"
              id="notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          { (durationMinutes === 0 || durationMinutes === Number(warmupMinutes || 0) || (instructorMinutesNumber > 0 && instructorMinutesNumber > durationMinutes)) && <div className="error" style={{ marginTop: 16 }}>
            <span>Imposta una durata valida.</span>
          </div> }

          <div className="row" style={{ gap: 12, marginTop: "16px" }}>
            <button className="btn" type="submit" disabled={durationMinutes === 0 || durationMinutes === Number(warmupMinutes || 0) || (instructorMinutesNumber > 0 && instructorMinutesNumber > durationMinutes)}>
              {effectiveSubmitLabel}
            </button>

            <Link href="/dashboard" className="btn secondary">
              Annulla
            </Link>
          </div>
        </div>
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Anteprima costi</h3>

        <div className="grid">
          <div className="field">
            <label>Tariffa noleggio applicata</label>
            <div>
              € {Number.isFinite(rentalRateNumber) ? rentalRateNumber.toFixed(2) : "0.00"}/h
            </div>
          </div>

          {instructorMinutesNumber > 0 && (
            <div className="field">
              <label>Tariffa istruttore applicata</label>
              <div>
                €{" "}
                {Number.isFinite(instructorRateNumber)
                  ? instructorRateNumber.toFixed(2)
                  : "0.00"}
                /h
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 16 }}>
          <div className="muted">Durata calcolata</div>
          <div className="big-number">
            {Math.floor(durationMinutes / 60)}:
            {durationMinutes % 60 < 10 ? `0${durationMinutes % 60}` : durationMinutes % 60}
          </div>
        </div>

        {totalCost > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="muted">Costo {insertMode === "PAST" ? "del volo" : "stimato"}</div>
            <div className="big-number">€ {totalCost.toFixed(2)}</div>
          </div>
        )}

        {totalCost > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="muted">Nuovo saldo{insertMode === "PAST" ? "" : " stimato"}</div>
            <div className="big-number">€ {(currentBalance - totalCost).toFixed(2)}</div>

            {!instructorName && instructorMinutesNumber === 0 && dateBipoExam != null && (
              <div style={{ marginTop: 8 }}>
                € {(currentBalance - totalCost / 2).toFixed(2)} se dividi i costi con il passeggero
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              Saldo attuale: € {currentBalance.toFixed(2)}.
            </div>
          </div>
        )}

        {currentBalance - totalCost < 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="muted">Ricarica necessaria{insertMode === "PAST" ? "" : " stimata"}</div>
            <div className="big-number">€ {(totalCost - currentBalance).toFixed(2)}</div>
          </div>
        )}

        {durationMinutes > 0 && (
          <div style={{ marginTop: 16 }}>
            <div className="muted">Nuove ore {insertMode === "PAST" ? "totali" : "stimate"}</div>
            <div className="big-number">
              {minutesToHoursMinutes(totalFlightMinutes + durationMinutes)}
            </div>
            <div style={{ marginTop: 8 }}>
              Ore totali attuali: {minutesToHoursMinutes(totalFlightMinutes)}.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
