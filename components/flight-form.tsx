"use client";

import { CopyArrowIcon } from "@/components/icons";
import Link from "next/link";
import { SubmitButton } from "./submit-button";
import {
  defaultWarmupMinutesForDate,
  formatDateTimeInput,
  minutesToHoursMinutes,
} from "@/lib/utils";
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
  bookingId?: string;
  submitLabel?: string;
  partnershipAircrafts?: Array<{
    id: string;
    registration: string;
    type: string;
    hourlyFuelCost: number;
    hourlyMaintCost: number;
    hourlyEngineFund: number;
  }>;
  rentalAircrafts?: Array<{
    id: string;
    registration: string;
    type: string;
    hourlyCost: number;
  }>;
};

function buildInitialValues(
  initialValues?: Partial<FlightFormValues>
): FlightFormValues {
  const defaultDate = initialValues?.date ?? new Date();

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
    warmupMinutes:
      initialValues?.warmupMinutes ??
      String(defaultWarmupMinutesForDate(defaultDate)),
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
  bookingId,
  partnershipAircrafts = [],
  rentalAircrafts = [],
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

  const isPartnershipAircraft = useMemo(() => {
    return partnershipAircrafts.find(a => a.registration === aircraftRegistration);
  }, [partnershipAircrafts, aircraftRegistration]);

  const configuredRentalAircraft = useMemo(() => {
    return rentalAircrafts.find(a => a.registration === aircraftRegistration);
  }, [rentalAircrafts, aircraftRegistration]);

  const effectiveRentalRate = isPartnershipAircraft
    ? (isPartnershipAircraft.hourlyFuelCost + isPartnershipAircraft.hourlyMaintCost + isPartnershipAircraft.hourlyEngineFund)
    : rentalRateNumber;

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
      (Number.isFinite(effectiveRentalRate) ? effectiveRentalRate : 0);

    const instructor = instructorMinutesNumber > 0 ?
      (instructorMinutesNumber / 60) *
      (Number.isFinite(instructorRateNumber) ? instructorRateNumber : 0) : 0;

    return base + instructor;
  }, [
    durationMinutes,
    instructorMinutesNumber,
    instructorRateNumber,
    effectiveRentalRate,
  ]);

  const deductedAmount = useMemo(() => {
    if (isPartnershipAircraft) {
      return instructorMinutesNumber > 0 ?
        (instructorMinutesNumber / 60) *
        (Number.isFinite(instructorRateNumber) ? instructorRateNumber : 0) : 0;
    }
    return totalCost;
  }, [totalCost, isPartnershipAircraft, instructorMinutesNumber, instructorRateNumber]);

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
        {bookingId ? (
          <input type="hidden" name="bookingId" value={bookingId} />
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
                list="partnershipAircraftsList"
                value={aircraftRegistration}
                onChange={(e) => {
                  const reg = e.target.value.toUpperCase();
                  setAircraftRegistration(reg);
                  const pa = partnershipAircrafts.find(a => a.registration === reg);
                  if (pa) {
                    setAircraftType(pa.type);
                  } else {
                    const ra = rentalAircrafts.find(a => a.registration === reg);
                    if (ra) {
                      setAircraftType(ra.type);
                      setRentalRate(String(ra.hourlyCost));
                    }
                  }
                }}
                required
              />
              <datalist id="partnershipAircraftsList">
                {partnershipAircrafts.map(pa => (
                  <option key={pa.id} value={pa.registration}>{pa.type} (Società)</option>
                ))}
                {rentalAircrafts.map(ra => (
                  <option key={ra.id} value={ra.registration}>{ra.type} (Noleggio Configurato)</option>
                ))}
              </datalist>
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
            {dateBipoExam && <div className="field">
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
            </div>}

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
              <label htmlFor="rentalRateApplied">
                {isPartnershipAircraft ? "Tariffa societaria (Costo orario totale)" : "Tariffa noleggio applicata (€/h)"}
              </label>
              <input
                className="input"
                id="rentalRateApplied"
                name="rentalRateApplied"
                type="number"
                min="0"
                step="0.01"
                value={isPartnershipAircraft ? effectiveRentalRate : rentalRate}
                onChange={(e) => {
                  if (!isPartnershipAircraft) {
                    setRentalRate(e.target.value);
                  }
                }}
                readOnly={!!isPartnershipAircraft}
                required
              />
              {isPartnershipAircraft && <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>Tariffa calcolata dai costi orari della società.</span>}
              {!isPartnershipAircraft && configuredRentalAircraft && <span className="muted" style={{ fontSize: 12, marginTop: 4 }}>Quota oraria precompilata in base all'aereo configurato.</span>}
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

          {(durationMinutes === 0 || durationMinutes === Number(warmupMinutes || 0) || (instructorMinutesNumber > 0 && instructorMinutesNumber > durationMinutes)) && <div className="error" style={{ marginTop: 16 }}>
            <span>Imposta una durata valida.</span>
          </div>}

          <div className="row" style={{ gap: 12, marginTop: "16px" }}>
            <SubmitButton disabled={durationMinutes === 0 || durationMinutes === Number(warmupMinutes || 0) || (instructorMinutesNumber > 0 && instructorMinutesNumber > durationMinutes)}>
              {effectiveSubmitLabel}
            </SubmitButton>

            <Link href="/logbook" className="btn secondary">
              Annulla
            </Link>
          </div>
        </div>
      </form>

      <div className="card" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", paddingBottom: "12px", marginBottom: "4px" }}>
          <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
            <span>📊</span> Anteprima Volo
          </h3>
          <span className="pill" style={{ fontSize: "0.75rem", padding: "2px 8px" }}>
            {insertMode === "PAST" ? "Consuntivo" : "Stima Pianificata"}
          </span>
        </div>

        {/* METRICS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "10px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              {isPartnershipAircraft ? "Tariffa Societaria" : "Tariffa Noleggio"}
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
              € {Number.isFinite(effectiveRentalRate) ? effectiveRentalRate.toFixed(2) : "0.00"}/h
            </div>
          </div>

          <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "10px" }}>
            <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
              Durata Volo
            </div>
            <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
              {Math.floor(durationMinutes / 60)}h {durationMinutes % 60}m
            </div>
          </div>

          {instructorMinutesNumber > 0 && (
            <div style={{ background: "var(--bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "10px", gridColumn: "span 2" }}>
              <div style={{ fontSize: "0.75rem", color: "var(--muted)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>
                Istruttore ({instructorMinutesNumber} min a € {instructorRateNumber.toFixed(2)}/h)
              </div>
              <div style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--text)" }}>
                Tariffa: € {instructorRateNumber.toFixed(2)}/h
              </div>
            </div>
          )}
        </div>

        {/* COST CARD */}
        {totalCost > 0 && (
          <div style={{ 
            background: "linear-gradient(135deg, rgba(31, 111, 91, 0.08) 0%, rgba(20, 82, 66, 0.03) 100%)", 
            border: "1px solid rgba(31, 111, 91, 0.25)", 
            borderRadius: "14px", 
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--primary-strong)", fontWeight: 600 }}>
                Costo {insertMode === "PAST" ? "del volo" : "stimato"}
              </span>
              <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--primary-strong)" }}>
                € {totalCost.toFixed(2)}
              </span>
            </div>

            {/* PASSENGER SPLIT SECTION */}
            {!instructorName && instructorMinutesNumber === 0 && dateBipoExam != null && (
              <div style={{ 
                borderTop: "1px dashed rgba(31, 111, 91, 0.2)", 
                paddingTop: "10px", 
                marginTop: "4px",
                display: "flex",
                flexDirection: "column",
                gap: "6px"
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.8rem", color: "var(--primary-strong)", fontWeight: 600 }}>
                  <span>👥</span> Divisione Costi Passeggero (Biposto)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "0.8rem" }}>
                  <div style={{ background: "rgba(255, 255, 255, 0.6)", borderRadius: "8px", padding: "6px 8px" }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Quota Pilota (50%)</div>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>€ {(totalCost / 2).toFixed(2)}</div>
                  </div>
                  <div style={{ background: "rgba(255, 255, 255, 0.6)", borderRadius: "8px", padding: "6px 8px" }}>
                    <div style={{ color: "var(--muted)", fontSize: "0.7rem" }}>Quota Passeggero (50%)</div>
                    <div style={{ fontWeight: 700, color: "var(--text)" }}>€ {(totalCost / 2).toFixed(2)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* BALANCE ACCOUNT IMPACT */}
        {deductedAmount > 0 && (
          <div style={{ 
            background: "var(--bg)", 
            border: "1px solid var(--border)", 
            borderRadius: "14px", 
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "10px"
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "6px", marginBottom: "2px" }}>
              💳 Saldo Personale AeroClub
            </div>
            
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--muted)" }}>Saldo attuale:</span>
              <span style={{ fontWeight: 600 }}>€ {currentBalance.toFixed(2)}</span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", alignItems: "center" }}>
              <span style={{ color: "var(--text)", fontWeight: 500 }}>Nuovo saldo {insertMode === "PAST" ? "" : "stimato"}:</span>
              <span style={{ fontWeight: 700, color: (currentBalance - deductedAmount < 0) ? "var(--danger)" : "var(--text)" }}>
                € {(currentBalance - deductedAmount).toFixed(2)}
              </span>
            </div>

            {/* Split Balance if passenger split applies */}
            {!instructorName && instructorMinutesNumber === 0 && dateBipoExam != null && !isPartnershipAircraft && (
              <div style={{ 
                background: "rgba(31, 111, 91, 0.05)", 
                border: "1px solid rgba(31, 111, 91, 0.15)",
                borderRadius: "10px", 
                padding: "8px 10px",
                display: "flex",
                flexDirection: "column",
                gap: "4px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", alignItems: "center" }}>
                  <span style={{ color: "var(--primary-strong)", fontWeight: 600 }}>Nuovo saldo con divisione:</span>
                  <span style={{ fontWeight: 800, color: "var(--primary-strong)" }}>
                    € {(currentBalance - deductedAmount / 2).toFixed(2)}
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: "var(--muted)", fontStyle: "italic" }}>
                  Ipotizzando il rimborso in contanti/cassa da parte del passeggero.
                </div>
              </div>
            )}

            {/* Top up warning if negative */}
            {currentBalance - deductedAmount < 0 && (
              <div style={{ 
                background: "rgba(180, 35, 24, 0.05)", 
                border: "1px solid rgba(180, 35, 24, 0.15)",
                borderRadius: "10px", 
                padding: "8px 10px",
                marginTop: "4px"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", alignItems: "center" }}>
                  <span style={{ color: "var(--danger)", fontWeight: 600 }}>Ricarica necessaria {insertMode === "PAST" ? "" : "stimata"}:</span>
                  <span style={{ fontWeight: 800, color: "var(--danger)" }}>
                    € {(deductedAmount - currentBalance).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PARTNERSHIP AIRCRAFT NOTICE */}
        {totalCost > 0 && isPartnershipAircraft && (
          <div style={{ 
            background: "rgba(2, 132, 199, 0.06)", 
            border: "1px solid rgba(2, 132, 199, 0.2)", 
            borderRadius: "14px", 
            padding: "14px",
            fontSize: "0.85rem",
            color: "#0369a1",
            lineHeight: "1.4"
          }}>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px" }}>
              <span>✈️</span> Volo Società
            </div>
            {instructorMinutesNumber > 0 ? (
              <>
                Il costo dell'aereo (<strong>€ {(totalCost - deductedAmount).toFixed(2)}</strong>) verrà addebitato sulla cassa societaria.
                <br />
                Il costo dell'istruttore (<strong>€ {deductedAmount.toFixed(2)}</strong>) sarà prelevato dal tuo saldo personale AeroClub.
              </>
            ) : (
              "Questo volo non ridurrà il tuo saldo AeroClub. Il costo dell'aereo verrà registrato e rendicontato nel report mensile della società."
            )}
            {/* If passenger split is active, add a minor note */}
            {!instructorName && instructorMinutesNumber === 0 && dateBipoExam != null && (
              <div style={{ marginTop: "6px", borderTop: "1px solid rgba(2, 132, 199, 0.15)", paddingTop: "6px", fontSize: "0.78rem", fontStyle: "italic" }}>
                Nota: La quota societaria a tuo carico rimarrà comunque registrata a tuo nome prima dell'eventuale divisione privata col passeggero.
              </div>
            )}
          </div>
        )}

        {/* FLIGHT HOURS CARD */}
        {durationMinutes > 0 && (
          <div style={{ 
            background: "var(--bg)", 
            border: "1px solid var(--border)", 
            borderRadius: "14px", 
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "8px"
          }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text)", borderBottom: "1px solid var(--border)", paddingBottom: "6px", marginBottom: "2px" }}>
              📈 Progressione Ore Volo
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem" }}>
              <span style={{ color: "var(--muted)" }}>Ore attuali:</span>
              <span style={{ fontWeight: 600 }}>{minutesToHoursMinutes(totalFlightMinutes)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", alignItems: "center" }}>
              <span style={{ color: "var(--text)", fontWeight: 500 }}>Nuove ore {insertMode === "PAST" ? "totali" : "stimate"}:</span>
              <span style={{ fontWeight: 700, color: "var(--primary-strong)" }}>
                {minutesToHoursMinutes(totalFlightMinutes + durationMinutes)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
