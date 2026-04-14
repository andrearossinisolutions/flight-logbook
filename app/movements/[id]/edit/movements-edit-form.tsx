"use client";

import Link from "next/link";
import { useState } from "react";
import { FlightInputMode, type Movement, type Flight } from "@prisma/client";

type MovementForClient = {
  id: string;
  userId: string;
  type: "TOPUP" | "SERVICE" | "FLIGHT";
  date: string;
  amount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  flight: {
    movementId: string;
    aircraftRegistration: string;
    aircraftType: string;
    inputMode: FlightInputMode;
    durationMinutes: number;
    hobbsStartMinutes: number | null;
    hobbsEndMinutes: number | null;
    instructorName: string | null;
    rentalRateApplied: number;
    instructorRateApplied: number;
    rentalCost: number;
    instructorCost: number;
    totalCost: number;
    createdAt: string;
    updatedAt: string;
  } | null;
};

type MovementsEditFormProps = {
  movement: MovementForClient;
  manualPrefill: { hours: number; minutes: number };
  hobbsStartPrefill: { hours: number; minutes: number };
  hobbsEndPrefill: { hours: number; minutes: number };
  updateMovement: (formData: FormData) => void | Promise<void>;
  deleteMovement: (formData: FormData) => void | Promise<void>;
};

export function MovementsEditForm({
  movement,
  manualPrefill,
  hobbsStartPrefill,
  hobbsEndPrefill,
  updateMovement,
  deleteMovement,
}: MovementsEditFormProps) {
  const flight = movement.flight;

  const [movementType, setMovementType] = useState<"TOPUP" | "SERVICE">(
    movement.type === "SERVICE" ? "SERVICE" : "TOPUP"
  );

  const isPaymentMovement = movement.type !== "FLIGHT";
  const showAmountField = movementType === "TOPUP" || movementType === "SERVICE";

  return (
    <div className="grid grid-2">
      <div className="card">
        <form action={updateMovement} className="grid">
          <input type="hidden" name="movementId" value={movement.id} />

          {movement.type === "FLIGHT" ? (
            <input type="hidden" name="movementType" value={movement.type} />
          ) : (
            <div className="field">
              <label htmlFor="movementType">Tipologia pagamento</label>
              <select
                className="select"
                id="movementType"
                name="movementType"
                value={movementType}
                onChange={(e) =>
                  setMovementType(e.target.value as "TOPUP" | "SERVICE")
                }
              >
                <option value="TOPUP">Ricarica credito</option>
                <option value="SERVICE">Pagamento servizio</option>
              </select>
            </div>
          )}

          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="date">Data</label>
              <input
                id="date"
                name="date"
                type="date"
                className="input"
                defaultValue={new Date(movement.date).toISOString().slice(0, 10)}
                required
              />
            </div>

            {isPaymentMovement && showAmountField ? (
              <div className="field">
                <label htmlFor="amount">Importo</label>
                <input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  className="input"
                  defaultValue={Number(movement.amount)}
                  required
                />
                <div className="muted" style={{ marginTop: 6 }}>
                  Positivo = ricarica. Negativo = rettifica/addebito.
                </div>
              </div>
            ) : null}
          </div>

          {movement.type === "FLIGHT" ? (
            <>
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="aircraftRegistration">Marche</label>
                  <input
                    id="aircraftRegistration"
                    name="aircraftRegistration"
                    className="input"
                    defaultValue={flight?.aircraftRegistration ?? "I-4150"}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="aircraftType">Tipo</label>
                  <input
                    id="aircraftType"
                    name="aircraftType"
                    className="input"
                    defaultValue={flight?.aircraftType ?? "P92"}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="inputMode">Modalità durata</label>
                  <select
                    id="inputMode"
                    name="inputMode"
                    className="select"
                    defaultValue={flight?.inputMode ?? FlightInputMode.MANUAL}
                  >
                    <option value={FlightInputMode.HOBBS}>Da orametro</option>
                    <option value={FlightInputMode.MANUAL}>Manuale</option>
                  </select>
                </div>

                <div className="field">
                  <label htmlFor="instructorName">Istruttore (opzionale)</label>
                  <input
                    id="instructorName"
                    name="instructorName"
                    className="input"
                    defaultValue={flight?.instructorName ?? ""}
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Ore volo</label>
                  <input
                    className="input"
                    name="manualHours"
                    type="number"
                    min="0"
                    defaultValue={manualPrefill.hours}
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
                    defaultValue={manualPrefill.minutes}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Orametro partenza — ore</label>
                  <input
                    className="input"
                    name="hobbsStartHours"
                    type="number"
                    min="0"
                    defaultValue={hobbsStartPrefill.hours}
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
                    defaultValue={hobbsStartPrefill.minutes}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label>Orametro arrivo — ore</label>
                  <input
                    className="input"
                    name="hobbsEndHours"
                    type="number"
                    min="0"
                    defaultValue={hobbsEndPrefill.hours}
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
                    defaultValue={hobbsEndPrefill.minutes}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="rentalRateApplied">
                    Tariffa noleggio applicata (€/h)
                  </label>
                  <input
                    id="rentalRateApplied"
                    name="rentalRateApplied"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    defaultValue={Number(flight?.rentalRateApplied ?? 150)}
                    required
                  />
                </div>

                <div className="field">
                  <label htmlFor="instructorRateApplied">
                    Tariffa istruttore applicata (€/h)
                  </label>
                  <input
                    id="instructorRateApplied"
                    name="instructorRateApplied"
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    defaultValue={Number(flight?.instructorRateApplied ?? 80)}
                    required
                  />
                </div>
              </div>
            </>
          ) : null}

          <div className="field">
            <label htmlFor="notes">Note</label>
            <textarea
              id="notes"
              name="notes"
              className="textarea"
              defaultValue={movement.notes ?? ""}
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button className="btn" type="submit">
              Salva modifiche
            </button>
            <Link href="/dashboard" className="btn secondary">
              Annulla
            </Link>
          </div>
        </form>
      </div>

      <div className="card">
        {movement.type !== "FLIGHT" ? (
          <>
            <h3 style={{ marginTop: 0 }}>Riepilogo movimento</h3>
            <div className="muted">Importo attuale</div>
            <div className="big-number">€ {Number(movement.amount).toFixed(2)}</div>
            <p className="muted" style={{ marginTop: 16 }}>
              Puoi usare importi positivi per ricariche e importi negativi per
              allineamenti saldo o addebiti manuali.
            </p>
          </>
        ) : (
          <>
            <h3 style={{ marginTop: 0 }}>Valori salvati</h3>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Aeromobile</div>
              <div className="big-number" style={{ fontSize: "1.5rem" }}>
                {flight?.aircraftRegistration ?? "I-4150"} ·{" "}
                {flight?.aircraftType ?? "P92"}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Durata registrata</div>
              <div className="big-number">
                {Math.floor((flight?.durationMinutes ?? 0) / 60)}h{" "}
                {(flight?.durationMinutes ?? 0) % 60}m
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Tariffa noleggio</div>
              <div>€ {Number(flight?.rentalRateApplied ?? 0).toFixed(2)}/h</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Tariffa istruttore</div>
              <div>€ {Number(flight?.instructorRateApplied ?? 0).toFixed(2)}/h</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Costo noleggio</div>
              <div>€ {Number(flight?.rentalCost ?? 0).toFixed(2)}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Costo istruttore</div>
              <div>€ {Number(flight?.instructorCost ?? 0).toFixed(2)}</div>
            </div>

            <div style={{ marginTop: 16 }}>
              <div className="muted">Costo totale</div>
              <div className="big-number">
                € {Number(flight?.totalCost ?? 0).toFixed(2)}
              </div>
            </div>

            <p className="muted" style={{ marginTop: 16 }}>
              Il costo viene ricalcolato usando i valori che inserisci nel form a
              sinistra.
            </p>
          </>
        )}

        <hr style={{ margin: "24px 0" }} />

        <form action={deleteMovement}>
          <input type="hidden" name="movementId" value={movement.id} />
          <button
            type="submit"
            className="btn"
            style={{ background: "#b91c1c" }}
          >
            Elimina movimento
          </button>
        </form>
      </div>
    </div>
  );
}