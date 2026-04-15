import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { DeleteMovementButton } from "@/components/delete-movement-button";
import { requireUser } from "@/lib/require-user";
import { eur, formatDateDisplay, minutesToHoursMinutes, medicalExamExpirationDate, medicalExamRemaining } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = user.settings;

  const movements = await prisma.movement.findMany({
    where: { userId: user.id },
    include: { flight: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  type MovementItem = (typeof movements)[number];

  const saldo = movements
    .filter((item: MovementItem) => item.type !== "SERVICE")
    .reduce(
      (acc: number, item: MovementItem) => acc + Number(item.amount),
      0
    );

  const totalFlightMinutes = movements.reduce(
    (acc: number, item: MovementItem) => acc + (item.flight?.durationMinutes ?? 0),
    0
  );

  const totalPICMinutes = movements.reduce(
    (acc: number, item: MovementItem) =>
      acc + (!item.flight?.instructorName ? (item.flight?.durationMinutes ?? 0) : 0),
    0
  );

  const totalInstructorMinutes = movements.reduce(
    (acc: number, item: MovementItem) =>
      acc + (item.flight?.instructorName ? (item.flight?.durationMinutes ?? 0) : 0),
    0
  );

  const totalPostExamMinutes = movements.reduce(
    (acc: number, item: MovementItem) =>
      acc + (settings?.dateMonoExam != null && item.date > settings.dateMonoExam ? (item.flight?.durationMinutes ?? 0) : 0),
    0
  );

  const totalPostExamPICMinutes = movements.reduce(
    (acc: number, item: MovementItem) =>
      acc + (!item.flight?.instructorName && settings?.dateMonoExam != null && item.date > settings.dateMonoExam ? (item.flight?.durationMinutes ?? 0) : 0),
    0
  );

  const totalPostExamInstructorMinutes = movements.reduce(
    (acc: number, item: MovementItem) =>
      acc + (item.flight?.instructorName && settings?.dateMonoExam != null && item.date > settings.dateMonoExam ? (item.flight?.durationMinutes ?? 0) : 0),
    0
  );

  const totalCosts = movements
    .filter((item: MovementItem) => item.type !== "FLIGHT")
    .reduce(
      (acc: number, item: MovementItem) => acc + Math.abs(Number(item.amount)),
      0
    );

  const totalTopups = movements
    .filter((item: MovementItem) => item.type === "TOPUP")
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (Number(item.amount) > 0 ? Number(item.amount) : 0),
      0
    );

  const totalServices = movements
    .filter((item: MovementItem) => item.type === "SERVICE")
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (Number(item.amount) > 0 ? Number(item.amount) : 0),
      0
    );

  async function deleteMovement(formData: FormData) {
    "use server";

    const user = await requireUser();
    const movementId = String(formData.get("movementId") ?? "");

    if (!movementId) {
      throw new Error("ID movimento mancante.");
    }

    const movement = await prisma.movement.findFirst({
      where: {
        id: movementId,
        userId: user.id,
      },
      include: {
        flight: true,
      },
    });

    if (!movement) {
      throw new Error("Movimento non trovato.");
    }

    await prisma.$transaction(async (tx) => {
      if (movement.flight) {
        await tx.flight.delete({
          where: { movementId: movement.id },
        });
      }

      await tx.movement.delete({
        where: { id: movement.id },
      });
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <AppShell
      title={`Ciao${user.fullName ? `, ${user.fullName}` : ""}`}
      subtitle="Saldo, movimenti e accesso rapido a inserimento volo, ricarica e settings."
    >
      <div className="summary-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="muted">Saldo attuale</div>
          <div className="big-number">{eur(saldo)}</div>
          <div className="muted" style={{ marginTop: 16 }}>
            Ore di volo disponibili
          </div>
          <div style={{ marginTop: 8 }}>
            PIC:{" "}
            {saldo > 0
              ? minutesToHoursMinutes(
                  (saldo /
                    (settings?.rentalRatePerHour
                      ? Number(settings.rentalRatePerHour)
                      : 150)) *
                    60
                )
              : "0:00"}
          </div>
          <div style={{ marginTop: 4 }}>
            Istruttore:{" "}
            {saldo > 0
              ? minutesToHoursMinutes(
                  (saldo /
                    ((settings?.rentalRatePerHour
                      ? Number(settings.rentalRatePerHour)
                      : 150) +
                      (settings?.instructorRatePerHour
                        ? Number(settings.instructorRatePerHour)
                        : 80))) *
                    60
                )
              : "0:00"}
          </div>
        </div>

        <div className="card">
          <div className="muted">Ore totali registrate</div>
          <div className="big-number">{minutesToHoursMinutes(totalFlightMinutes)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div style={{ marginTop: 8 }}>
            PIC: {minutesToHoursMinutes(totalPICMinutes)}
          </div>
          <div style={{ marginTop: 4 }}>
            Istruttore: {minutesToHoursMinutes(totalInstructorMinutes)}
          </div>
        </div>

        { settings?.dateMonoExam != null && <div className="card">
          <div className="muted">Ore con attestato</div>
          <div className="big-number">{minutesToHoursMinutes(totalPostExamMinutes)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div style={{ marginTop: 8 }}>
            PIC: {minutesToHoursMinutes(totalPostExamPICMinutes)}
          </div>
          <div style={{ marginTop: 4 }}>
            Istruttore: {minutesToHoursMinutes(totalPostExamInstructorMinutes)}
          </div>
        </div> }

        { settings?.dateMedicalExam != null && <div className="card">
          <div className="muted">Scadenza visita medica</div>
          <div className="big-number">{formatDateDisplay(medicalExamExpirationDate(settings.dateMedicalExam))}</div>
          <div style={{ marginTop: 8 }}>
            Data visita: {formatDateDisplay(settings.dateMedicalExam)}
          </div>
          <div style={{ marginTop: 8 }}>
            Rimanenti: {medicalExamRemaining(settings.dateMedicalExam)}
          </div>
        </div> }

        <div className="card">
          <div className="muted">Spese registrate</div>
          <div className="big-number">{eur(totalCosts)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div style={{ marginTop: 8 }}>Ricariche: {eur(totalTopups)}</div>
          <div style={{ marginTop: 8 }}>Servizi: {eur(totalServices)}</div>
        </div>
      </div>

      <div className="between" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Registro movimenti</h2>
        <div className="row">
          <Link className="btn" href="/new-flight">
            Nuovo volo
          </Link>
          <Link className="btn secondary" href="/new-topup">
            Nuovo pagamento
          </Link>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Dettagli</th>
              <th>Importo</th>
              <th>Azioni</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nessun movimento inserito.
                </td>
              </tr>
            ) : null}

            {movements.map((item: MovementItem) => {
              return (
                <tr key={item.id}>
                  <td>{formatDateDisplay(item.date)}</td>

                  <td>
                    {item.type === "FLIGHT"
                      ? "Volo"
                      : item.type === "TOPUP" && Number(item.amount) < 0
                      ? "Rettifica saldo"
                      : "Ricarica"}
                  </td>

                  <td>
                    { dashboardItem(item) }
                  </td>

                  <td style={{ fontWeight: 700 }}>{eur(Number(item.amount))}</td>

                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <Link className="btn secondary" href={`/movements/${item.id}/edit`}>
                        Modifica
                      </Link>

                      <form action={deleteMovement}>
                        <input type="hidden" name="movementId" value={item.id} />
                        <DeleteMovementButton />
                      </form>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function dashboardItem(item: any) {
  switch (item.type) {
    case "TOPUP":
      return (
        <div>
          <div>
            { item.type === "TOPUP" && Number(item.amount) < 0
              ? "Correzione saldo / addebito manuale"
              : "Credito aggiunto"}
          </div>
          {item.notes ? <div className="muted">{item.notes}</div> : null}
        </div>
      )
    case "SERVICE":
      return (
        <div>
          <div>
            Pagamento servizio
          </div>
          {item.notes ? <div className="muted">{item.notes}</div> : null}
        </div>
      )
    case "FLIGHT":
      return (
        <div>
          <div>
            {item.flight?.aircraftRegistration ?? "I-4150"} ·{" "}
            {item.flight?.aircraftType ?? "P92"} ·{" "}
            {minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}
          </div>

          <div className="muted">
            { flightType(item.flight) }
          </div>

          {item.notes ? <div className="muted">Note: {item.notes}</div> : null}
        </div>
      )
  }
}

function flightType(flight: any) {
  if (flight.instructorMinutes == flight.durationMinutes) {
    return "Lezione";
  } else if (flight.instructorMinutes < flight.durationMinutes) {
    return "Noleggio + Lezione";
  }
  return "Noleggio";
}