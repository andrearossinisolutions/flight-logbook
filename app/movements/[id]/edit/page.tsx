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

    const aircraft = String(formData.get("aircraft") ?? "P92").trim() || "P92";

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
          aircraft,
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
      <div className="card" style={{ maxWidth: 920 }}>
        <form action={updateMovement} className="stack">
          <input type="hidden" name="movementId" value={movement.id} />
          <input type="hidden" name="movementType" value={movement.type} />

          <div className="grid grid-2">
            <div className="field">
              <label className="label" htmlFor="date">
                Data
              </label>
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
                <label className="label" htmlFor="amount">
                  Importo
                </label>
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
            ) : (
              <div className="field">
                <label className="label" htmlFor="aircraft">
                  Aeromobile
                </label>
                <input
                  id="aircraft"
                  name="aircraft"
                  type="text"
                  className="input"
                  defaultValue={flight?.aircraft ?? "P92"}
                  required
                />
              </div>
            )}
          </div>

          {!isTopup && (
            <>
              <div className="grid grid-2">
                <div className="field">
                  <label className="label" htmlFor="inputMode">
                    Modalità inserimento durata
                  </label>
                  <select
                    id="inputMode"
                    name="inputMode"
                    className="input"
                    defaultValue={flight?.inputMode ?? FlightInputMode.MANUAL}
                  >
                    <option value={FlightInputMode.MANUAL}>Durata manuale</option>
                    <option value={FlightInputMode.HOBBS}>Da orametro</option>
                  </select>
                </div>

                <div className="field">
                  <label className="label" htmlFor="instructorName">
                    Istruttore
                  </label>
                  <input
                    id="instructorName"
                    name="instructorName"
                    type="text"
                    className="input"
                    placeholder="Lascia vuoto se non presente"
                    defaultValue={flight?.instructorName ?? ""}
                  />
                </div>
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Valori attualmente salvati</div>
                <div className="grid grid-2">
                  <div className="field">
                    <div className="muted">Durata registrata</div>
                    <div>{flight?.durationMinutes ?? 0} minuti</div>
                  </div>
                  <div className="field">
                    <div className="muted">Costo totale registrato</div>
                    <div>{Number(flight?.totalCost ?? 0).toFixed(2)} €</div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Durata manuale</div>
                <div className="grid grid-2">
                  <div className="field">
                    <label className="label" htmlFor="manualHours">
                      Ore
                    </label>
                    <input
                      id="manualHours"
                      name="manualHours"
                      type="number"
                      min="0"
                      className="input"
                      defaultValue={manualPrefill.hours}
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="manualMinutes">
                      Minuti
                    </label>
                    <input
                      id="manualMinutes"
                      name="manualMinutes"
                      type="number"
                      min="0"
                      max="59"
                      className="input"
                      defaultValue={manualPrefill.minutes}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Orametro</div>
                <div className="grid grid-2">
                  <div className="field">
                    <label className="label" htmlFor="hobbsStartHours">
                      Partenza ore
                    </label>
                    <input
                      id="hobbsStartHours"
                      name="hobbsStartHours"
                      type="number"
                      min="0"
                      className="input"
                      defaultValue={hobbsStartPrefill.hours}
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="hobbsStartMinutes">
                      Partenza minuti
                    </label>
                    <input
                      id="hobbsStartMinutes"
                      name="hobbsStartMinutes"
                      type="number"
                      min="0"
                      max="59"
                      className="input"
                      defaultValue={hobbsStartPrefill.minutes}
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="hobbsEndHours">
                      Arrivo ore
                    </label>
                    <input
                      id="hobbsEndHours"
                      name="hobbsEndHours"
                      type="number"
                      min="0"
                      className="input"
                      defaultValue={hobbsEndPrefill.hours}
                    />
                  </div>

                  <div className="field">
                    <label className="label" htmlFor="hobbsEndMinutes">
                      Arrivo minuti
                    </label>
                    <input
                      id="hobbsEndMinutes"
                      name="hobbsEndMinutes"
                      type="number"
                      min="0"
                      max="59"
                      className="input"
                      defaultValue={hobbsEndPrefill.minutes}
                    />
                  </div>
                </div>
              </div>

              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: 12 }}>Tariffe applicate</div>
                <div className="grid grid-2">
                  <div className="field">
                    <label className="label" htmlFor="rentalRateApplied">
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
                    <label className="label" htmlFor="instructorRateApplied">
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
              </div>

              <div className="muted">
                Il costo totale viene ricalcolato in base alla durata inserita e alle tariffe applicate.
              </div>
            </>
          )}

          <div className="field">
            <label className="label" htmlFor="notes">
              Note
            </label>
            <textarea
              id="notes"
              name="notes"
              className="input"
              rows={4}
              defaultValue={movement.notes ?? ""}
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button type="submit" className="btn">
              Salva modifiche
            </button>

            <Link href="/dashboard" className="btn secondary">
              Annulla
            </Link>
          </div>
        </form>

        <hr style={{ margin: "24px 0" }} />

        <form action={deleteMovement}>
          <input type="hidden" name="movementId" value={movement.id} />
          <button type="submit" className="btn" style={{ background: "#b91c1c" }}>
            Elimina movimento
          </button>
        </form>
      </div>
    </AppShell>
  );
}