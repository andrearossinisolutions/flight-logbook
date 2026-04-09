import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { FlightInputMode } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function formatDateInput(value: Date) {
  return new Date(value).toISOString().slice(0, 10);
}

function toInt(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
}

function toFloat(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
}

function splitMinutes(totalMinutes: number | null | undefined) {
  const safe = Math.max(0, totalMinutes ?? 0);
  return {
    hours: Math.floor(safe / 60),
    minutes: safe % 60,
  };
}

export default async function EditMovementPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const movement = await prisma.movement.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      flight: true,
    },
  });

  if (!movement) {
    notFound();
  }

  const isTopup = movement.type === "TOPUP";
  const flight = movement.flight;

  const manualPrefill = splitMinutes(flight?.durationMinutes);
  const hobbsStartPrefill = splitMinutes(flight?.hobbsStartMinutes);
  const hobbsEndPrefill = splitMinutes(flight?.hobbsEndMinutes);

  async function updateMovement(formData: FormData) {
    "use server";

    const user = await requireUser();
    const movementId = String(formData.get("movementId") ?? "");
    const movementType = String(formData.get("movementType") ?? "");

    const dbMovement = await prisma.movement.findFirst({
      where: {
        id: movementId,
        userId: user.id,
      },
      include: {
        flight: true,
      },
    });

    if (!dbMovement) {
      throw new Error("Movimento non trovato.");
    }

    const dateRaw = String(formData.get("date") ?? "");
    const notesRaw = String(formData.get("notes") ?? "").trim();

    if (!dateRaw) {
      throw new Error("La data è obbligatoria.");
    }

    if (movementType === "TOPUP") {
      const amount = toFloat(formData.get("amount"));

      if (!Number.isFinite(amount) || amount === 0) {
        throw new Error("L'importo deve essere diverso da zero.");
      }

      await prisma.movement.update({
        where: { id: dbMovement.id },
        data: {
          date: new Date(dateRaw),
          amount,
          notes: notesRaw || null,
        },
      });

      revalidatePath("/dashboard");
      redirect("/dashboard");
    }

    if (movementType !== "FLIGHT" || !dbMovement.flight) {
      throw new Error("Tipo movimento non valido.");
    }

    const aircraftRegistration =
      String(formData.get("aircraftRegistration") ?? "I-4150").trim() || "I-4150";
    const aircraftType =
      String(formData.get("aircraftType") ?? "P92").trim() || "P92";

    const inputModeRaw = String(formData.get("inputMode") ?? FlightInputMode.MANUAL);
    const inputMode: FlightInputMode =
      inputModeRaw === FlightInputMode.HOBBS
        ? FlightInputMode.HOBBS
        : FlightInputMode.MANUAL;

    const instructorNameRaw = String(formData.get("instructorName") ?? "").trim();

    const rentalRateApplied = toFloat(formData.get("rentalRateApplied"));
    const instructorRateApplied = toFloat(formData.get("instructorRateApplied"));

    if (rentalRateApplied < 0 || instructorRateApplied < 0) {
      throw new Error("Le tariffe non possono essere negative.");
    }

    const manualHours = toInt(formData.get("manualHours"));
    const manualMinutes = toInt(formData.get("manualMinutes"));

    const hobbsStartHours = toInt(formData.get("hobbsStartHours"));
    const hobbsStartMinutesOnly = toInt(formData.get("hobbsStartMinutes"));
    const hobbsEndHours = toInt(formData.get("hobbsEndHours"));
    const hobbsEndMinutesOnly = toInt(formData.get("hobbsEndMinutes"));

    let durationMinutes = 0;
    let hobbsStartMinutes: number | null = null;
    let hobbsEndMinutes: number | null = null;

    if (inputMode === FlightInputMode.HOBBS) {
      if (hobbsStartMinutesOnly < 0 || hobbsStartMinutesOnly > 59) {
        throw new Error("I minuti dell'orametro di partenza devono essere tra 0 e 59.");
      }

      if (hobbsEndMinutesOnly < 0 || hobbsEndMinutesOnly > 59) {
        throw new Error("I minuti dell'orametro di arrivo devono essere tra 0 e 59.");
      }

      hobbsStartMinutes = hobbsStartHours * 60 + hobbsStartMinutesOnly;
      hobbsEndMinutes = hobbsEndHours * 60 + hobbsEndMinutesOnly;

      if (hobbsEndMinutes < hobbsStartMinutes) {
        throw new Error("L'orametro di arrivo deve essere maggiore o uguale a quello di partenza.");
      }

      durationMinutes = hobbsEndMinutes - hobbsStartMinutes;
    } else {
      if (manualMinutes < 0 || manualMinutes > 59) {
        throw new Error("I minuti manuali devono essere tra 0 e 59.");
      }

      durationMinutes = manualHours * 60 + manualMinutes;
      hobbsStartMinutes = null;
      hobbsEndMinutes = null;
    }

    if (durationMinutes <= 0) {
      throw new Error("La durata del volo deve essere maggiore di zero.");
    }

    const hasInstructor = instructorNameRaw.length > 0;
    const durationHours = durationMinutes / 60;

    const rentalCost = durationHours * rentalRateApplied;
    const instructorCost = hasInstructor ? durationHours * instructorRateApplied : 0;
    const totalCost = rentalCost + instructorCost;
    const movementAmount = -totalCost;

    await prisma.$transaction(async (tx) => {
      await tx.flight.update({
        where: {
          movementId: dbMovement.id,
        },
        data: {
          aircraftRegistration,
          aircraftType,
          inputMode,
          durationMinutes,
          hobbsStartMinutes,
          hobbsEndMinutes,
          instructorName: hasInstructor ? instructorNameRaw : null,
          rentalRateApplied,
          instructorRateApplied,
          rentalCost,
          instructorCost,
          totalCost,
        },
      });

      await tx.movement.update({
        where: { id: dbMovement.id },
        data: {
          date: new Date(dateRaw),
          amount: movementAmount,
          notes: notesRaw || null,
        },
      });
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  async function deleteMovement(formData: FormData) {
    "use server";

    const user = await requireUser();
    const movementId = String(formData.get("movementId") ?? "");

    const dbMovement = await prisma.movement.findFirst({
      where: {
        id: movementId,
        userId: user.id,
      },
      include: {
        flight: true,
      },
    });

    if (!dbMovement) {
      throw new Error("Movimento non trovato.");
    }

    await prisma.$transaction(async (tx) => {
      if (dbMovement.flight) {
        await tx.flight.delete({
          where: { movementId: dbMovement.id },
        });
      }

      await tx.movement.delete({
        where: { id: dbMovement.id },
      });
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <AppShell
      title={isTopup ? "Modifica movimento saldo" : "Modifica volo"}
      subtitle={
        isTopup
          ? "Puoi usare importi positivi o negativi."
          : "Puoi correggere durata, istruttore e tariffe applicate."
      }
    >
      <div className="grid grid-2">
        <div className="card">
          <form action={updateMovement} className="grid">
            <input type="hidden" name="movementId" value={movement.id} />
            <input type="hidden" name="movementType" value={movement.type} />

            <div className="grid grid-2">
              <div className="field">
                <label htmlFor="date">Data</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  className="input"
                  defaultValue={formatDateInput(movement.date)}
                  required
                />
              </div>

              {isTopup ? (
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

            {!isTopup ? (
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
                    <label htmlFor="rentalRateApplied">Tariffa noleggio applicata (€/h)</label>
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
                    <label htmlFor="instructorRateApplied">Tariffa istruttore applicata (€/h)</label>
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
          {isTopup ? (
            <>
              <h3 style={{ marginTop: 0 }}>Riepilogo movimento</h3>
              <div className="muted">Importo attuale</div>
              <div className="big-number">€ {Number(movement.amount).toFixed(2)}</div>
              <p className="muted" style={{ marginTop: 16 }}>
                Puoi usare importi positivi per ricariche e importi negativi per allineamenti saldo o addebiti manuali.
              </p>
            </>
          ) : (
            <>
              <h3 style={{ marginTop: 0 }}>Valori salvati</h3>

              <div style={{ marginTop: 16 }}>
                <div className="muted">Aeromobile</div>
                <div className="big-number" style={{ fontSize: "1.5rem" }}>
                  {flight?.aircraftRegistration ?? "I-4150"} · {flight?.aircraftType ?? "P92"}
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div className="muted">Durata registrata</div>
                <div className="big-number">
                  {Math.floor((flight?.durationMinutes ?? 0) / 60)}h {(flight?.durationMinutes ?? 0) % 60}m
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
                <div className="big-number">€ {Number(flight?.totalCost ?? 0).toFixed(2)}</div>
              </div>

              <p className="muted" style={{ marginTop: 16 }}>
                Il costo viene ricalcolato usando i valori che inserisci nel form a sinistra.
              </p>
            </>
          )}

          <hr style={{ margin: "24px 0" }} />

          <form action={deleteMovement}>
            <input type="hidden" name="movementId" value={movement.id} />
            <button type="submit" className="btn" style={{ background: "#b91c1c" }}>
              Elimina movimento
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}