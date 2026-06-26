import { Suspense } from "react";
import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { DashboardWidgets } from "@/components/dashboard-widgets";
import { DeleteMovementButton } from "@/components/delete-movement-button";
import { DashboardRegistryActions } from "@/components/dashboard-registry-actions";
import { BookPlannedFlightButton } from "@/components/book-planned-flight-button";

import {
  AirplaneIcon,
  CalendarIcon,
  CalendarPlusIcon,
  MoneyBillIcon,
  PencilIcon,
  PlusIcon,
} from "@/components/icons";
import { requireUser } from "@/lib/require-user";
import { eur, formatDateDisplay, formatTimeDisplay, minutesToHoursMinutes, medicalExamExpirationDate, medicalExamRemaining, daysFromDate, daysToDate, hasTime, getRomeDateTimeParts, romeLocalDateTimeToUtcDate, formatHoursToHHMM } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

function isToday(date: Date) {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
}

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

  const bookings = await prisma.partnershipBooking.findMany({
    where: { userId: user.id },
    include: {
      aircraft: true,
      partnership: true,
    },
    orderBy: { startTime: "asc" },
  });

  type MovementItem = (typeof allMovements)[number];

  const partnerships = await prisma.partnership.findMany({
    where: {
      members: { some: { userId: user.id } }
    },
    include: {
      aircrafts: {
        include: {
          flights: {
            where: {
              movement: {
                isDraft: false
              }
            },
            select: {
              durationMinutes: true
            }
          },
          reminders: true
        }
      }
    }
  });

  const alerts: Array<{
    partnershipId: string;
    partnershipName: string;
    aircraftRegistration: string;
    reminderDescription: string;
    isOverdue: boolean;
    labelText: string;
    detailsText: string;
  }> = [];

  for (const p of partnerships) {
    for (const a of p.aircrafts) {
      const flightMinutes = a.flights.reduce((sum, f) => sum + f.durationMinutes, 0);
      const totalHours = Number(a.initialHours) + (flightMinutes / 60);
      
      for (const r of a.reminders) {
        let isOverdue = false;
        let isWarning = false;
        
        let hoursRemainingNum = Infinity;
        let daysRemainingNum = Infinity;
        
        const detailsParts: string[] = [];
        
        if (r.hoursInterval !== null && r.hoursInterval !== undefined) {
          const hoursInt = Number(r.hoursInterval);
          const nextDeadlineHours = Number(r.lastCompletedHours) + hoursInt;
          const remainingHours = nextDeadlineHours - totalHours;
          hoursRemainingNum = remainingHours;
          
          if (remainingHours <= 10) {
            isWarning = true;
          }
          if (remainingHours <= 0) {
            isOverdue = true;
          }
          
          detailsParts.push(`Scadenza a ${formatHoursToHHMM(nextDeadlineHours)} (ogni ${hoursInt}h)`);
        }
        
        if (r.monthsInterval !== null && r.monthsInterval !== undefined && r.lastCompletedDate) {
          const monthsInt = Number(r.monthsInterval);
          const nextDeadlineDate = new Date(r.lastCompletedDate);
          nextDeadlineDate.setMonth(nextDeadlineDate.getMonth() + monthsInt);
          
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const deadlineStart = new Date(nextDeadlineDate.getFullYear(), nextDeadlineDate.getMonth(), nextDeadlineDate.getDate());
          
          const remainingDays = Math.ceil((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
          daysRemainingNum = remainingDays;
          
          if (remainingDays <= 30) {
            isWarning = true;
          }
          if (remainingDays <= 0) {
            isOverdue = true;
          }
          
          const formattedDate = nextDeadlineDate.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          });
          detailsParts.push(`Scadenza il ${formattedDate} (ogni ${monthsInt} mesi)`);
        }
        
        if (isWarning || isOverdue) {
          let labelText = "";
          const hasHours = r.hoursInterval !== null && r.hoursInterval !== undefined;
          const hasMonths = r.monthsInterval !== null && r.monthsInterval !== undefined && r.lastCompletedDate;
          
          const isHoursMoreUrgent = hasHours && (!hasMonths || (hoursRemainingNum / 10 <= daysRemainingNum / 30));
          
          if (isHoursMoreUrgent) {
            if (hoursRemainingNum <= 0) {
              labelText = `SCADUTO da ${formatHoursToHHMM(Math.abs(hoursRemainingNum))}!`;
            } else {
              labelText = `In scadenza! Mancano solo ${formatHoursToHHMM(hoursRemainingNum)}.`;
            }
          } else if (hasMonths) {
            if (daysRemainingNum <= 0) {
              const absDays = Math.abs(daysRemainingNum);
              labelText = `SCADUTO da ${absDays} giorn${absDays === 1 ? 'o' : 'i'}!`;
            } else {
              labelText = `In scadenza! Mancano solo ${daysRemainingNum} giorn${daysRemainingNum === 1 ? 'o' : 'i'}.`;
            }
          }
          
          alerts.push({
            partnershipId: p.id,
            partnershipName: p.name,
            aircraftRegistration: a.registration,
            reminderDescription: r.description,
            isOverdue,
            labelText,
            detailsText: `${r.description} · ${detailsParts.join(" o ")}`
          });
        }
      }
    }
  }

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

  const { filter, error, success } = await searchParams;
  const filterVal = typeof filter === "string" ? filter : undefined;
  const errorMsg = typeof error === "string" ? error : undefined;
  const successMsg = typeof success === "string" ? success : undefined;

  const movements = allMovements.filter((item: MovementItem) => {
    if (!filterVal) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filterVal) {
      case "pianificazioni":
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

  const filteredBookings = bookings.filter((booking) => {
    if (!filterVal) return true;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (filterVal) {
      case "pianificazioni":
        return booking.startTime >= today;
      case "voli-passati":
        return false;
      case "pagamenti":
        return false;
      case "promemoria-futuri":
        return false;
      default:
        return true;
    }
  });

  const bookingsWithoutPlannedFlights = filteredBookings.filter((b) => {
    const hasMatchingDraft = allMovements.some((m) => {
      if (m.type !== "FLIGHT" || !m.isDraft || !m.flight?.partnershipAircraftId) {
        return false;
      }
      if (m.flight.partnershipAircraftId !== b.aircraftId) {
        return false;
      }
      const flightStart = new Date(m.date);
      const flightEnd = new Date(flightStart.getTime() + (m.flight.durationMinutes * 60 * 1000));
      return b.startTime < flightEnd && b.endTime > flightStart;
    });
    return !hasMatchingDraft;
  });

  type CombinedItem =
    | {
        isBooking: true;
        id: string;
        date: Date;
        booking: (typeof bookings)[number];
      }
    | {
        isBooking: false;
        id: string;
        date: Date;
        movement: MovementItem;
      };

  const combinedItems: CombinedItem[] = [
    ...movements.map((m) => ({
      isBooking: false as const,
      id: m.id,
      date: m.date,
      movement: m,
    })),
    ...bookingsWithoutPlannedFlights.map((b) => ({
      isBooking: true as const,
      id: b.id,
      date: b.startTime,
      booking: b,
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

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

    revalidatePath("/logbook");
    redirect("/logbook");
  }

  async function bookPlannedFlight(formData: FormData) {
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
        type: "FLIGHT",
      },
      include: {
        flight: {
          include: {
            partnershipAircraft: true,
          }
        },
      },
    });

    if (!movement || !movement.flight || !movement.flight.partnershipAircraftId || !movement.flight.partnershipAircraft) {
      throw new Error("Volo societario non trovato o dati mancanti.");
    }

    const flight = movement.flight;
    const aircraftId = flight.partnershipAircraftId;
    if (aircraftId === null) {
      throw new Error("Aereo societario non associato al volo.");
    }
    const partnershipAircraft = flight.partnershipAircraft;
    if (partnershipAircraft === null) {
      throw new Error("Associazione società aereo non trovata.");
    }
    const flightStart = new Date(movement.date);
    const flightEnd = new Date(flightStart.getTime() + (flight.durationMinutes * 60 * 1000));

    // Check overlap for the same aircraft
    const overlappingBooking = await prisma.partnershipBooking.findFirst({
      where: {
        aircraftId: aircraftId,
        startTime: {
          lt: flightEnd
        },
        endTime: {
          gt: flightStart
        }
      },
      include: {
        user: true
      }
    });

    if (overlappingBooking) {
      const occupantName = overlappingBooking.user.fullName || overlappingBooking.user.email;
      redirect(`/logbook?error=${encodeURIComponent(`L'aereo è già prenotato da ${occupantName} nel periodo selezionato.`)}`);
    }

    await prisma.partnershipBooking.create({
      data: {
        partnershipId: partnershipAircraft.partnershipId,
        userId: user.id,
        aircraftId: aircraftId,
        startTime: flightStart,
        endTime: flightEnd,
        notes: movement.notes ? `Volo pianificato: ${movement.notes}` : "Prenotazione da volo pianificato"
      }
    });

    revalidatePath("/logbook");
    redirect(`/logbook?success=${encodeURIComponent("Prenotazione registrata con successo!")}`);
  }

  return (
    <AppShell
      title={`Ciao${user.fullName ? `, ${user.fullName}` : ""}`}
      subtitle="Saldo, movimenti e accesso rapido a inserimento volo, ricarica e settings."
      className="dashboard-container"
    >
      {errorMsg && (
        <div style={{ 
          backgroundColor: "rgba(220, 38, 38, 0.1)", 
          border: "1px solid rgba(220, 38, 38, 0.2)", 
          borderRadius: 16, 
          padding: "16px 20px", 
          color: "var(--danger)",
          marginBottom: 24,
          fontWeight: 600
        }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ 
          backgroundColor: "rgba(22, 163, 74, 0.1)", 
          border: "1px solid rgba(22, 163, 74, 0.2)", 
          borderRadius: 16, 
          padding: "16px 20px", 
          color: "#16a34a",
          marginBottom: 24,
          fontWeight: 600
        }}>
          ✅ {successMsg}
        </div>
      )}

      {alerts.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {alerts.map((alert, i) => {
            const isOverdue = alert.isOverdue;
            const bg = isOverdue ? "rgba(180, 35, 24, 0.1)" : "#fef3c7";
            const border = isOverdue ? "1px solid var(--danger)" : "1px solid #b45309";
            const color = isOverdue ? "var(--danger)" : "#b45309";
            const icon = isOverdue ? "🚨" : "⚠️";

            return (
              <div 
                key={i} 
                style={{ 
                  backgroundColor: bg, 
                  border, 
                  borderRadius: 16, 
                  padding: "16px 20px", 
                  color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 16
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                      Manutenzione {alert.aircraftRegistration} ({alert.partnershipName})
                    </div>
                    <div style={{ fontSize: "0.85rem", marginTop: 2, opacity: 0.9 }}>
                      {alert.labelText} · {alert.detailsText}
                    </div>
                  </div>
                </div>
                <Link 
                  href={`/societa/${alert.partnershipId}` as Route}
                  className="btn"
                  style={{ 
                    backgroundColor: isOverdue ? "var(--danger)" : "#b45309", 
                    color: "white", 
                    padding: "8px 16px", 
                    fontSize: "0.85rem", 
                    textDecoration: "none",
                    borderRadius: 12,
                    fontWeight: 600,
                    whiteSpace: "nowrap"
                  }}
                >
                  Gestisci
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <DashboardWidgets>
        <div className="card">
          <div className="muted">Saldo attuale (AeroClub)</div>
          <div className="big-number">{eur(saldo)}</div>
          <div className="muted" style={{ marginTop: 16 }}>
            Ore di volo disponibili
          </div>
          <div className="inline-meta" style={{ marginTop: 8 }}>
            ⏱️ PiC:{" "}
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
            ⏱️ Istruttore:{" "}
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
            ⏱️ PiC: {minutesToHoursMinutes(last6mPICMinutes)}
          </div><br />
          <div className="inline-meta" style={{ marginTop: 4 }}>
            ⏱️ Istruttore: {minutesToHoursMinutes(last6mInstructorMinutes)}
          </div>
        </div>}

        <div className="card">
          <div className="muted">Da sempre</div>
          <div className="medium-number">{totalFlights.length} voli | {minutesToHoursMinutes(totalFlightMinutes)}</div>
          <div className="muted" style={{ marginTop: 16 }}>Di cui</div>
          <div className="inline-meta" style={{ marginTop: 8 }}>
            ⏱️ PiC: {minutesToHoursMinutes(totalPICMinutes)}
          </div><br />
          <div className="inline-meta" style={{ marginTop: 4 }}>
            ⏱️ Istruttore: {minutesToHoursMinutes(totalInstructorMinutes)}
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
            {combinedItems.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">
                  Nessun movimento o prenotazione trovato.
                </td>
              </tr>
            ) : null}

            {combinedItems.map((item) => {
              const now = new Date();
              const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const isFutureMovement = item.date > now;

              if (item.isBooking) {
                const booking = item.booking;
                return (
                  <tr key={booking.id}>
                    <td>
                      <div className={"inline-meta" + (isFutureMovement ? " future-movement" : "")}>
                        <CalendarIcon />
                        <span>{formatDateDisplay(item.date)}</span>
                      </div><br />
                      <div className={"inline-meta" + (isFutureMovement ? " future-movement" : "")}>
                        🕒 <span>{formatTimeDisplay(item.date)}</span>
                      </div>
                    </td>

                    <td>
                      <div className="inline-meta">
                        <span style={{ fontSize: "16px", display: "inline-block", lineHeight: 1 }}>📅</span>
                        <span className={isFutureMovement ? "future-movement" : undefined}>
                          Prenotazione
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="grid grid-2">
                        <div>
                          <div className={"muted" + (isFutureMovement ? " future-movement" : "")}>
                            ✈️ {booking.aircraft.registration} ({booking.aircraft.type})
                          </div>
                          <div className={isFutureMovement ? "future-movement" : undefined} style={{ fontSize: "0.8rem", marginTop: 2 }}>
                            Società: <span className="pill" style={{ fontSize: "0.72rem", backgroundColor: "var(--border)", padding: "2px 6px", borderRadius: 6 }}>{booking.partnership.name}</span>
                          </div>
                        </div>
                        <div>
                          {booking.notes && <div className={isFutureMovement ? "future-movement" : undefined} style={{ fontSize: "0.85rem" }}>Note: <i>{booking.notes}</i></div>}
                        </div>
                      </div>
                    </td>

                    <td style={{ fontWeight: 700 }} className="muted">
                      —
                    </td>

                    <td>
                      <div className="row" style={{ gap: 8, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                        {booking.startTime >= today && (
                          <Link
                            href={`/briefing?icao=${encodeURIComponent(booking.notes || settings?.defaultBase || "LIML")}&date=${encodeURIComponent(booking.startTime.toISOString())}`}
                            className="btn secondary"
                            style={{
                              padding: "6px 8px",
                              fontSize: "1.1rem",
                              borderRadius: 8,
                              lineHeight: 1,
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              textDecoration: "none"
                            }}
                            title="Briefing Meteo"
                          >
                            🌤️
                          </Link>
                        )}
                        <Link
                          href={`/new-flight?bookingId=${booking.id}`}
                          className="btn"
                          style={{
                            padding: !isFutureMovement ? "6px 12px" : "8px",
                            fontSize: "0.8rem",
                            lineHeight: 1,
                            borderRadius: 8,
                            backgroundColor: !isFutureMovement ? "#16a34a" : "var(--border)",
                            borderColor: !isFutureMovement ? "#16a34a" : "var(--border)",
                            color: !isFutureMovement ? "white" : "var(--text)",
                            fontWeight: 600,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center"
                          }}
                          title={isFutureMovement ? "Precompila volo" : "Registra volo"}
                        >
                          {!isFutureMovement ? "Registra volo" : <PlusIcon size={16} />}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              }

              const m = item.movement;
              return (
                <tr key={m.id}>
                  <td>
                    <div className={"inline-meta" + (isFutureMovement ? " future-movement" : "")}>
                      <CalendarIcon />
                      <span>{formatDateDisplay(m.date)}</span>
                    </div><br />
                    {((m.type === "FLIGHT") || (m.type === "REMINDER" && hasTime(m.date))) &&
                      <div className={"inline-meta" + (isFutureMovement ? " future-movement" : "")}>
                        🕒 <span>{formatTimeDisplay(m.date)}</span>
                      </div>
                    }
                  </td>

                  <td>
                    <div className="inline-meta">
                      {m.type === "FLIGHT" ? (
                        <AirplaneIcon />
                      ) : m.type === "REMINDER" ? (
                        <span style={{ fontSize: "16px", display: "inline-block", lineHeight: 1 }}>🔔</span>
                      ) : (
                        <MoneyBillIcon />
                      )}
                      <span className={isFutureMovement ? "future-movement" : undefined}>
                        {m.type === "FLIGHT"
                          ? m.isDraft
                            ? m.date < now
                              ? <span style={{ color: "#b91c1c" }}>Pianificazione<br />da confermare</span>
                              : "Pianificazione"
                            : flightType(m.flight)
                          : m.type === "REMINDER"
                            ? "Promemoria"
                            : m.isDraft
                              ? m.date < today
                                ? <span style={{ color: "#b91c1c" }}>Pagamento<br />da confermare</span>
                                : "Scadenza"
                              : m.type === "TOPUP" && Number(m.amount) < 0
                                ? "Rettifica saldo"
                                : "Pagamento"}
                      </span>
                    </div>
                  </td>

                  <td>
                    {dashboardItem(m, allMovements, isFutureMovement, bookings)}
                  </td>

                  <td style={{ fontWeight: 700 }}>
                    {m.type === "REMINDER" ? "—" : eur(Number(m.amount))}
                  </td>

                  <td>
                    <div className="row" style={{ gap: 8, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                      {m.type === "FLIGHT" && m.isDraft && m.date >= today && (
                        <Link
                          href={`/briefing?icao=${encodeURIComponent(
                            [m.flight?.takeoffPlace, m.flight?.arrivalPlace].filter(Boolean).join(" - ") || m.notes || settings?.defaultBase || "LIML"
                          )}&date=${encodeURIComponent(m.date.toISOString())}`}
                          className="btn secondary icon-btn"
                          style={{
                            padding: 0,
                            width: 40,
                            height: 40,
                            fontSize: "1.2rem",
                            borderRadius: 14,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            textDecoration: "none"
                          }}
                          title="Briefing Meteo"
                        >
                          🌤️
                        </Link>
                      )}

                      {((m.isDraft && m.date >= today) || (m.type === "REMINDER" && m.date >= today)) ? (
                        <a
                          className="btn secondary icon-btn"
                          href={buildCalendarLink(m)}
                          aria-label="Aggiungi al calendario"
                          title="Aggiungi al calendario"
                          target="_blank"
                          rel="noreferrer"
                        >
                          <CalendarPlusIcon size={18} />
                        </a>
                      ) : null}

                      {m.type === "FLIGHT" && m.isDraft && m.flight?.partnershipAircraftId && (() => {
                        const flightStart = new Date(m.date);
                        const flightEnd = new Date(flightStart.getTime() + (m.flight.durationMinutes * 60 * 1000));
                        const hasBooking = bookings.some(b => 
                          b.aircraftId === m.flight?.partnershipAircraftId &&
                          new Date(b.startTime) < flightEnd &&
                          new Date(b.endTime) > flightStart
                        );
                        if (!hasBooking) {
                          return (
                            <form action={bookPlannedFlight}>
                              <input type="hidden" name="movementId" value={m.id} />
                              <BookPlannedFlightButton />
                            </form>
                          );
                        }
                        return null;
                      })()}

                      <Link
                        className="btn secondary icon-btn"
                        href={m.type === "FLIGHT" ? `/edit-flight/${m.id}` : m.type === "REMINDER" ? `/edit-reminder/${m.id}` : `/edit-payment/${m.id}`}
                        aria-label="Modifica"
                        title="Modifica"
                      >
                        <PencilIcon size={18} />
                      </Link>

                      <form action={deleteMovement}>
                        <input type="hidden" name="movementId" value={m.id} />
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

function dashboardItem(item: any, movements: any[] = [], isFutureMovement = false, bookings: any[] = []) {
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

      const isCompanyAircraft = !!item.flight?.partnershipAircraftId;
      let bookingWarning = null;
      if (item.isDraft && isCompanyAircraft) {
        const flightStart = new Date(item.date);
        const flightEnd = new Date(flightStart.getTime() + (item.flight.durationMinutes * 60 * 1000));
        const hasBooking = bookings.some(b => 
          b.aircraftId === item.flight?.partnershipAircraftId &&
          new Date(b.startTime) < flightEnd &&
          new Date(b.endTime) > flightStart
        );
        if (!hasBooking) {
          bookingWarning = (
            <span style={{ 
              color: "#d97706", 
              backgroundColor: "#fef3c7", 
              padding: "2px 6px", 
              borderRadius: "6px", 
              fontSize: "0.75rem",
              fontWeight: 600,
              display: "inline-block",
              marginLeft: "8px"
            }}>
              ⚠️ Senza prenotazione
            </span>
          );
        } else {
          bookingWarning = (
            <span style={{ 
              color: "#16a34a", 
              backgroundColor: "rgba(22, 163, 74, 0.1)", 
              padding: "2px 6px", 
              borderRadius: "6px", 
              fontSize: "0.75rem",
              fontWeight: 600,
              display: "inline-block",
              marginLeft: "8px"
            }}>
              ✅ Prenotato
            </span>
          );
        }
      }

      return (
        <div className="grid grid-2">
          <div>
            <div className={"muted" + (isFutureMovement ? " future-movement" : "")}>
              ✈️ {(item.flight?.aircraftRegistration ?? "I-4150") + " · "}
              ⏱️ {minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}
              {bookingWarning}
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
              ⏱️ {minutesToHoursMinutes(progressiveFlightMinutes) + " · "}
              💶 {eur(progressiveSaldo)}
            </span>
          </div>

          {item.notes ? <div className={isFutureMovement ? "future-movement" : undefined}>Note: <i>{item.notes}</i></div> : null}
        </div>
      )
    case "REMINDER":
      const hasTimeReminder = hasTime(item.date);
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
  if (!flight) return "Volo";
  const isPartnership = !!flight.partnershipAircraftId;

  if (flight.instructorMinutes == flight.durationMinutes) {
    return "Lezione";
  } else if (flight.instructorMinutes > 0 && flight.instructorMinutes < flight.durationMinutes) {
    return isPartnership ? "Volo Società con lezione" : "Noleggio con lezione";
  }
  return isPartnership ? "Volo Società" : "Noleggio";
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
  const hasTimeVal = hasTime(start);

  let dates: string;
  if (hasTimeVal) {
    const end = new Date(start.getTime() + 30 * 60 * 1000); // 30 mins
    dates = `${formatCalendarDateTime(start)}/${formatCalendarDateTime(end)}`;
  } else {
    const parts = getRomeDateTimeParts(start);
    const end = romeLocalDateTimeToUtcDate(parts.year, parts.month, parts.day + 1, 0, 0, 0);
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
  const parts = getRomeDateTimeParts(start);
  const end = romeLocalDateTimeToUtcDate(parts.year, parts.month, parts.day + 1, 0, 0, 0);

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
  const parts = getRomeDateTimeParts(date);
  const yyyy = parts.year;
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

function formatCalendarDateTime(date: Date) {
  const parts = getRomeDateTimeParts(date);
  const yyyy = parts.year;
  const mm = String(parts.month).padStart(2, "0");
  const dd = String(parts.day).padStart(2, "0");
  const hh = String(parts.hour).padStart(2, "0");
  const min = String(parts.minute).padStart(2, "0");
  const ss = String(parts.second).padStart(2, "0");
  return `${yyyy}${mm}${dd}T${hh}${min}${ss}`;
}
