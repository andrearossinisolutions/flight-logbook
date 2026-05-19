import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { DeleteMovementButton } from "@/components/delete-movement-button";
import { DashboardRegistryActions } from "@/components/dashboard-registry-actions";

import {
  AirplaneIcon,
  CalendarIcon,
  CalendarPlusIcon,
  MoneyBillIcon,
  PencilIcon,
} from "@/components/icons";
import { requireUser } from "@/lib/require-user";
import { eur, formatDateDisplay, formatTimeDisplay, minutesToHoursMinutes, medicalExamExpirationDate, medicalExamRemaining, daysFromDate, daysToDate } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const settings = user.settings;

  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  const allMovements = await prisma.movement.findMany({
    where: { userId: user.id },
    include: { flight: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  type MovementItem = (typeof allMovements)[number];

  const saldo = allMovements
    .filter((item: MovementItem) => item.type !== "SERVICE" && !item.isDraft)
    .reduce(
      (acc: number, item: MovementItem) => acc + Number(item.amount),
      0
    );

  const futureFlights = allMovements
    .filter((item: MovementItem) => item.type === "FLIGHT" && item.isDraft && item.date > new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const nextFlight = futureFlights.length > 0 ? futureFlights[0] : null;

  const flights = allMovements
    .filter((item: MovementItem) => item.type === "FLIGHT" && !item.isDraft);

  const lastFlight = flights.length > 0 ? flights[0] : null;

  const last6mFlights = allMovements
    .filter((item: MovementItem) => item.type === "FLIGHT" && !item.isDraft && item.date >= new Date(new Date().setMonth(new Date().getMonth() - 6)));

  const last6mMinutes = last6mFlights
    .reduce((sum, flight) => sum + (flight.flight?.durationMinutes ?? 0), 0);

  const last6mPICMinutes = last6mFlights
    .reduce((sum, flight) => sum + (flight.flight?.durationMinutes ?? 0) - (flight.flight?.instructorMinutes ?? 0), 0);

  const last6mInstructorMinutes = last6mFlights
    .reduce((sum, flight) => sum + (flight.flight?.instructorMinutes ?? 0), 0);

  const totalFlights = allMovements.filter((item: MovementItem) => item.type === "FLIGHT" && !item.isDraft);

  const totalFlightMinutes = totalFlights
    .reduce(
      (acc: number, item: MovementItem) => acc + (item.flight?.durationMinutes ?? 0),
      0
    );

  const totalPICMinutes = totalFlights
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (item.flight?.durationMinutes ?? 0) - (item.flight?.instructorMinutes ?? 0),
      0
    );

  const totalInstructorMinutes = totalFlights
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (item.flight?.instructorMinutes ?? 0),
      0
    );

  const totalPostExamFlights = allMovements
    .filter((item: MovementItem) => item.type === "FLIGHT" && !item.isDraft && settings?.dateMonoExam != null && item.date > settings.dateMonoExam);

  const totalPostExamMinutes = totalPostExamFlights
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (settings?.dateMonoExam != null && item.date > settings.dateMonoExam ? (item.flight?.durationMinutes ?? 0) : 0),
      0
    );

  const totalPostExamPICMinutes = totalPostExamFlights
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (settings?.dateMonoExam != null && item.date > settings.dateMonoExam ? ((item.flight?.durationMinutes ?? 0) - (item.flight?.instructorMinutes ?? 0)) : 0),
      0
    );

  const totalPostExamInstructorMinutes = totalPostExamFlights
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (settings?.dateMonoExam != null && item.date > settings.dateMonoExam ? (item.flight?.instructorMinutes ?? 0) : 0),
      0
    );

  const totalCosts = allMovements
    .filter((item: MovementItem) => item.type !== "FLIGHT" && !item.isDraft)
    .reduce(
      (acc: number, item: MovementItem) => acc + Math.abs(Number(item.amount)),
      0
    );

  const draftCostMovements = allMovements
    .filter((item: MovementItem) => item.type !== "FLIGHT" && item.isDraft);

  const draftCosts = draftCostMovements
    .reduce(
      (acc: number, item: MovementItem) => acc + Math.abs(Number(item.amount)),
      0
    );

  const draftFutureCosts = draftCostMovements
    .filter((item: MovementItem) => item.date >= new Date())
    .reduce(
      (acc: number, item: MovementItem) => acc + Math.abs(Number(item.amount)),
      0
    );

  const draftPastCosts = draftCostMovements
    .filter((item: MovementItem) => item.date < new Date())
    .reduce(
      (acc: number, item: MovementItem) => acc + Math.abs(Number(item.amount)),
      0
    );

  const totalTopups = allMovements
    .filter((item: MovementItem) => item.type === "TOPUP" && !item.isDraft)
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (Number(item.amount) > 0 ? Number(item.amount) : 0),
      0
    );

  const totalServices = allMovements
    .filter((item: MovementItem) => item.type === "SERVICE" && !item.isDraft)
    .reduce(
      (acc: number, item: MovementItem) =>
        acc + (Number(item.amount) > 0 ? Number(item.amount) : 0),
      0
    );

  const { filter } = await searchParams;
  const filterVal = typeof filter === "string" ? filter : undefined;

  const movements = allMovements.filter((item: MovementItem) => {
    if (!filterVal) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filterVal) {
      case "prenotazioni":
        return item.type === "FLIGHT" && item.isDraft && item.date >= today;
      case "voli-passati":
        return item.type === "FLIGHT" && !item.isDraft;
      case "pagamenti":
        return item.type === "TOPUP" || item.type === "SERVICE";
      case "promemoria-futuri":
        return item.type === "REMINDER" && item.date >= today;
      default:
        return true;
    }
  });

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
      className="dashboard-container"
    >
      <DashboardWidgets>
        <div className="card">
          <div className="muted">Saldo attuale (AeroClub)</div>
          <div className="big-number">{eur(saldo)}</div>
          <div className="muted" style={{ marginTop: 16 }}>
            Ore di volo disponibili
          </div>
          <div className="inline-meta" style={{ marginTop: 8 }}>
            ⌛️ PIC:{" "}
            {saldo > 0
              ? minutesToHoursMinutes(
                (saldo /
                  (settings?.rentalRatePerHour
                    ? Number(settings.rentalRatePerHour)
                    : 150)) *
                60
              )
              : "0:00"}
          </div><br />
          <div className="inline-meta" style={{ marginTop: 4 }}>
            ⌛️ Istruttore:{" "}
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

        {lastFlight && <div className="card">
          <div className="muted">Ultimo volo</div>
          <div className="medium-number">{daysFromDate(lastFlight.date)}</div>
          <div className="inline-meta" style={{ marginTop: 24 }}>
            <CalendarIcon />
            <span>{formatDateDisplay(lastFlight.date)}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            {flightType(lastFlight.flight)}
          </div>
          <div style={{ marginTop: 4 }}>
            {lastFlight.flight?.aircraftRegistration ?? "I-4150"} ·{" "}
            {lastFlight.flight?.aircraftType ?? "P92"} ·{" "}
            {minutesToHoursMinutes(lastFlight.flight?.durationMinutes ?? 0)}
          </div>
        </div>}

        {nextFlight && <div className="card">
          <div className="muted">Prossimo volo</div>
          <div className="medium-number">{daysToDate(nextFlight.date)}</div>
          <div className="inline-meta" style={{ marginTop: 24 }}>
            <CalendarIcon />
            <span>{formatDateDisplay(nextFlight.date)}</span>
          </div>
          <div style={{ marginTop: 4 }}>
            {flightType(nextFlight.flight)}
          </div>
          <div style={{ marginTop: 4 }}>
            {nextFlight.flight?.aircraftRegistration ?? "I-4150"} ·{" "}
            {nextFlight.flight?.aircraftType ?? "P92"} ·{" "}
            {minutesToHoursMinutes(nextFlight.flight?.durationMinutes ?? 0)}
          </div>
        </div>}

        {last6mFlights.length > 0 && <div className="card">
          <div className="muted">Negli ultimi 6 mesi</div>
          <div className="medium-number">{last6mFlights.length} voli | {minutesToHoursMinutes(last6mMinutes)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div className="inline-meta" style={{ marginTop: 8 }}>
            ⌛️ PIC: {minutesToHoursMinutes(last6mPICMinutes)}
          </div><br />
          <div className="inline-meta" style={{ marginTop: 4 }}>
            ⌛️ Istruttore: {minutesToHoursMinutes(last6mInstructorMinutes)}
          </div>
        </div>}

        <div className="card">
          <div className="muted">Dal primo giorno</div>
          <div className="medium-number">{totalFlights.length} voli | {minutesToHoursMinutes(totalFlightMinutes)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div className="inline-meta" style={{ marginTop: 8 }}>
            ⌛️ PIC: {minutesToHoursMinutes(totalPICMinutes)}
          </div><br />
          <div className="inline-meta" style={{ marginTop: 4 }}>
            ⌛️ Istruttore: {minutesToHoursMinutes(totalInstructorMinutes)}
          </div>
        </div>

        {settings?.dateMedicalExam != null && <div className="card">
          <div className="muted">Scadenza visita medica</div>
          <div className="big-number">{formatDateDisplay(medicalExamExpirationDate(settings.dateMedicalExam))}</div>
          <div style={{ marginTop: 8 }}>
            Scade tra {medicalExamRemaining(settings.dateMedicalExam)}
          </div>
          <div className="inline-meta" style={{ marginTop: 32 }}>
            📅 Visita: {formatDateDisplay(settings.dateMedicalExam)}
          </div>
        </div>}

        <div className="card">
          <div className="muted">Spese registrate</div>
          <div className="big-number">{eur(totalCosts)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div style={{ marginTop: 8 }}>Ricariche: {eur(totalTopups)}</div>
          <div style={{ marginTop: 4 }}>Servizi: {eur(totalServices)}</div>
        </div>

        <div className="card">
          <div className="muted">Spese in scadenza</div>
          <div className="big-number">{eur(draftCosts)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div style={{ marginTop: 8 }}>Futuri: {eur(draftFutureCosts)}</div>
          <div style={{ marginTop: 4 }}>Da confermare: {eur(draftPastCosts)}</div>
        </div>
      </DashboardWidgets>

      <div className="between dashboard-registry-header" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Registro movimenti</h2>
        <Suspense fallback={<div style={{ display: "inline-block", width: 150, height: 40 }} />}>
          <DashboardRegistryActions />
        </Suspense>
      </div>

      <div className="card dashboard-registry-table" style={{ overflowX: "auto" }}>
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
              const now = new Date()
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isFutureMovement = item.date > now;
              return (
                <tr key={item.id}>
                  <td>
                    <div className={"inline-meta" + (isFutureMovement ? " future-movement" : "")}>
                      <CalendarIcon />
                      <span>{formatDateDisplay(item.date)}</span>
                    </div><br />
                    {((item.type === "FLIGHT") || (item.type === "REMINDER" && (item.date.getHours() !== 0 || item.date.getMinutes() !== 0))) &&
                      <div className={"inline-meta" + (isFutureMovement ? " future-movement" : "")}>
                        🕒 <span>{formatTimeDisplay(item.date)}</span>
                      </div>
                    }
                  </td>

                  <td>
                    <div className="inline-meta">
                      {item.type === "FLIGHT" ? (
                        <AirplaneIcon />
                      ) : item.type === "REMINDER" ? (
                        <span style={{ fontSize: "16px", display: "inline-block", lineHeight: 1 }}>🔔</span>
                      ) : (
                        <MoneyBillIcon />
                      )}
                      <span className={isFutureMovement ? "future-movement" : undefined}>
                        {item.type === "FLIGHT"
                          ? item.isDraft
                            ? item.date < now
                              ? <span style={{ color: "#b91c1c" }}>Pianificazione<br />da confermare</span>
                              : "Pianificazione"
                            : flightType(item.flight)
                          : item.type === "REMINDER"
                            ? "Promemoria"
                            : item.isDraft
                              ? item.date < today
                                ? <span style={{ color: "#b91c1c" }}>Pagamento<br />da confermare</span>
                                : "Scadenza"
                              : item.type === "TOPUP" && Number(item.amount) < 0
                                ? "Rettifica saldo"
                                : "Pagamento"}
                      </span>
                    </div>
                  </td>

                  <td>
                    {dashboardItem(item, allMovements, isFutureMovement)}
                  </td>

                  <td style={{ fontWeight: 700 }}>
                    {item.type === "REMINDER" ? "—" : eur(Number(item.amount))}
                  </td>

                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                      {((item.isDraft && item.date >= today) || (item.type === "REMINDER" && item.date >= today)) ? (
                        <a
                          className="btn secondary icon-btn"
                          href={buildCalendarLink(item)}
                          aria-label="Aggiungi al calendario"
                          title="Aggiungi al calendario"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <CalendarPlusIcon size={18} />
                        </a>
                      ) : null}

                      <Link
                        className="btn secondary icon-btn"
                        href={item.type === "FLIGHT" ? `/edit-flight/${item.id}` : item.type === "REMINDER" ? `/edit-reminder/${item.id}` : `/edit-payment/${item.id}`}
                        aria-label="Modifica"
                        title="Modifica"
                      >
                        <PencilIcon size={18} />
                      </Link>

                      <form action={deleteMovement}>
                        <input type="hidden" name="movementId" value={item.id} />
                        <DeleteMovementButton iconOnly />
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

function dashboardItem(item: any, movements: any[] = [], isFutureMovement = false) {
  type MovementItem = (typeof movements)[number];

  const progressiveSaldo = movements
    .filter((progrItem: MovementItem) => progrItem.type !== "SERVICE")
    .reduce(
      (acc: number, progrItem: MovementItem) => acc + (progrItem.date <= item.date ? Number(progrItem.amount) : 0),
      0
    );

  switch (item.type) {
    case "TOPUP":
      return (
        <div className="grid grid-2">
          {item.type === "TOPUP" && Number(item.amount) < 0
            ? <div className="muted" style={{ color: "#b91c1c" }}>Correzione saldo / addebito manuale</div>
            : <div className="muted" style={{ color: "green" }}>Ricarica credito</div>
          }

          <div>
            <span className={isFutureMovement ? "future-movement" : undefined}>
              Progressivo: 💶 {eur(progressiveSaldo)}
            </span>
          </div>

          {item.notes ? <div className={isFutureMovement ? "future-movement" : undefined}>Note: <i>{item.notes}</i></div> : null}
        </div>
      )
    case "SERVICE":
      return (
        <div className="grid grid-2">
          <div className="muted">
            Pagamento servizio
          </div>

          {item.notes ? <div className={isFutureMovement ? "future-movement" : undefined}>Note: <i>{item.notes}</i></div> : null}
        </div>
      )
    case "FLIGHT":
      const progressiveFlightMinutes = movements.reduce(
        (acc: number, progrItem: MovementItem) => acc + (progrItem.date <= item.date ? progrItem.flight?.durationMinutes ?? 0 : 0),
        0
      );

      return (
        <div className="grid grid-2">
          <div>
            <div className={"muted" + (isFutureMovement ? " future-movement" : "")}>
              ✈️ {(item.flight?.aircraftRegistration ?? "I-4150") + " · "}
              ⌛️ {minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}
            </div>
            {(item.flight?.takeoffPlace != null || item.flight?.arrivalPlace != null) &&
              <div className={isFutureMovement ? "future-movement" : undefined}>
                🛫 {item.flight?.takeoffPlace ?? "?"} · 🛬 {item.flight?.arrivalPlace ?? "?"}
              </div>
            }
          </div>

          <div>
            <span className={isFutureMovement ? "future-movement" : undefined}>
              {item.isDraft ? "Bozza progressivo: " : "Progressivo: "}
              ⌛️ {minutesToHoursMinutes(progressiveFlightMinutes) + " · "}
              💶 {eur(progressiveSaldo)}
            </span>
          </div>

          {item.notes ? <div className={isFutureMovement ? "future-movement" : undefined}>Note: <i>{item.notes}</i></div> : null}
        </div>
      )
    case "REMINDER":
      const hasTimeReminder = item.date.getHours() !== 0 || item.date.getMinutes() !== 0;
      return (
        <div className="grid grid-2">
          <div>
            <div className={"muted" + (isFutureMovement ? " future-movement" : "")} style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <span>Descrizione</span>
              {hasTimeReminder && <span className="pill" style={{ background: "rgba(2, 132, 199, 0.1)", color: "#0284c7", fontSize: "0.75rem", padding: "2px 6px" }}>🕒 {formatTimeDisplay(item.date)}</span>}
            </div>
            <div className={isFutureMovement ? "future-movement" : undefined} style={{ marginTop: 4 }}>
              {item.notes}
            </div>
          </div>
        </div>
      )
  }
}

function flightType(flight: any) {
  if (flight.instructorMinutes == flight.durationMinutes) {
    return "Lezione";
  } else if (flight.instructorMinutes > 0 && flight.instructorMinutes < flight.durationMinutes) {
    return "Noleggio con lezione";
  }/*  else if (flight.passengerName) {
    return "Noleggio con passeggero";
  } */
  return "Noleggio";
}

function buildCalendarLink(item: any) {
  if (item.type === "REMINDER") {
    return buildReminderCalendarLink(item);
  }

  if (item.type !== "FLIGHT") {
    return buildPaymentCalendarLink(item);
  }

  const start = new Date(item.date);
  const end = new Date(start.getTime() + (item.flight?.durationMinutes ?? 0) * 60 * 1000);

  const title = `${flightType(item.flight)} · ${item.flight?.aircraftRegistration ?? "I-4150"} (${item.flight?.aircraftType ?? "P92"})`;
  const details = [
    `Tipo: ${flightType(item.flight)}`,
    `Aeromobile: ${item.flight?.aircraftRegistration ?? "I-4150"} · ${item.flight?.aircraftType ?? "P92"}`,
    `Durata prevista: ${minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}`,
    item.notes ? `Note: ${item.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatCalendarDateTime(start)}/${formatCalendarDateTime(end)}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildReminderCalendarLink(item: any) {
  const start = new Date(item.date);
  const hasTime = start.getHours() !== 0 || start.getMinutes() !== 0;

  let dates: string;
  if (hasTime) {
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins
    dates = `${formatCalendarDateTime(start)}/${formatCalendarDateTime(end)}`;
  } else {
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    dates = `${formatCalendarDate(start)}/${formatCalendarDate(end)}`;
  }

  const title = item.notes && item.notes.length > 50
    ? `🔔 Promemoria: ${item.notes.substring(0, 47)}...`
    : `🔔 Promemoria: ${item.notes || ""}`;

  const details = item.notes || "";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function buildPaymentCalendarLink(item: any) {
  const start = new Date(item.date);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);

  const title = item.type === "SERVICE"
    ? `Scadenza pagamento servizio · ${eur(Number(item.amount))}`
    : `Scadenza pagamento · ${eur(Number(item.amount))}`;

  const details = [
    `Tipo: ${item.type === "SERVICE" ? "Pagamento servizio" : "Pagamento"}`,
    `Importo: ${eur(Number(item.amount))}`,
    item.notes ? `Note: ${item.notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    details,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function formatCalendarDate(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function formatCalendarDateTime(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
}
