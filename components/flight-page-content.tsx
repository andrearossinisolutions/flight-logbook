import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import FlightForm from "@/components/flight-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  buildFlightInitialValues,
  parseFlightFormData,
  splitMinutes,
  type FlightFormValues,
} from "@/lib/flight-form";
import { defaultWarmupMinutesForDate, formatDateTimeInput, parseRomeDateTime } from "@/lib/utils";
import { MovementType, Prisma } from "@prisma/client";

type FlightPageContentProps =
  | {
      mode: "create";
      bookingId?: string;
      prefillDate?: string;
      prefillNotes?: string;
      prefillIsDraft?: boolean;
      backTo?: string;
    }
  | {
      mode: "edit";
      movementId: string;
      backTo?: string;
    };

export default async function FlightPageContent(
  props: FlightPageContentProps
) {
  const user = await requireUser();
  const settings = user.settings;

  const booking = (props.mode === "create" && props.bookingId)
    ? await prisma.partnershipBooking.findUnique({
        where: { id: props.bookingId },
        include: {
          aircraft: true,
          partnership: true,
        },
      })
    : null;

  let movementToEdit = null;
  let targetUserId = user.id;

  if (props.mode === "edit") {
    const m = await prisma.movement.findUnique({
      where: { id: props.movementId },
      include: { flight: true }
    });
    if (m && m.type === "FLIGHT") {
      let isAuthorized = m.userId === user.id;
      if (!isAuthorized && m.flight?.partnershipAircraftId) {
        const aircraft = await prisma.partnershipAircraft.findUnique({
          where: { id: m.flight.partnershipAircraftId },
          include: {
            partnership: {
              include: {
                members: true
              }
            }
          }
        });
        if (aircraft) {
          const member = aircraft.partnership.members.find(mem => mem.userId === user.id);
          if (member && member.role === "ADMIN") {
            isAuthorized = true;
          }
        }
      }

      if (isAuthorized) {
        movementToEdit = m;
        targetUserId = m.userId;
      }
    }
  }

  let linkedBooking =
    props.mode === "edit" && movementToEdit?.flight?.bookingId
      ? await prisma.partnershipBooking.findUnique({
          where: { id: movementToEdit.flight.bookingId },
          select: { id: true, startTime: true, endTime: true },
        })
      : null;

  // Older flights were never explicitly linked (Flight.bookingId), but the logbook
  // detects them as booked by matching aircraft + overlapping time window. Fall back
  // to that same matching so the edit page also recognizes them as already booked.
  if (!linkedBooking && props.mode === "edit" && movementToEdit?.flight?.partnershipAircraftId) {
    const flightStart = movementToEdit.date;
    const flightEnd = new Date(flightStart.getTime() + movementToEdit.flight.durationMinutes * 60 * 1000);

    linkedBooking = await prisma.partnershipBooking.findFirst({
      where: {
        aircraftId: movementToEdit.flight.partnershipAircraftId,
        startTime: { lt: flightEnd },
        endTime: { gt: flightStart },
      },
      select: { id: true, startTime: true, endTime: true },
    });
  }

  const movements = await prisma.movement.findMany({
    where: { userId: targetUserId },
    select: {
      id: true,
      amount: true,
      type: true,
      notes: true,
      date: true,
      isDraft: true,
      flight: true,
    },
  });

  const partnershipMemberships = await prisma.partnershipMember.findMany({
    where: { userId: user.id },
    include: {
      partnership: {
        include: {
          aircrafts: true,
        },
      },
    },
  });

  const partnershipAircrafts = partnershipMemberships.flatMap(pm => 
    (pm.partnership.aircrafts || []).map(a => ({
      id: a.id,
      registration: a.registration,
      type: a.type,
      hourlyFuelCost: Number(a.hourlyFuelCost),
      hourlyMaintCost: Number(a.hourlyMaintCost),
      hourlyEngineFund: Number(a.hourlyEngineFund),
      partnershipId: pm.partnership.id,
    }))
  );

  const rentalAircrafts = (user.rentalAircrafts || []).map(a => ({
    id: a.id,
    registration: a.registration,
    type: a.type,
    hourlyCost: Number(a.hourlyCost),
  }));

  const currentBalance = movements
    .filter((m) => m.type !== "SERVICE" && !m.isDraft)
    .reduce((acc, item) => acc + Number(item.amount), 0);

  const totalFlightMinutes = movements
    .filter((m) => m.type === "FLIGHT" && !m.isDraft)
    .reduce(
      (acc, item) => acc + (item.flight?.durationMinutes ?? 0),
      0
  );

  const visitedPlacesSet = new Set<string>();
  for (const m of movements) {
    if (m.type === "FLIGHT" && m.flight) {
      if (m.flight.takeoffPlace) {
        visitedPlacesSet.add(m.flight.takeoffPlace.trim().toUpperCase());
      }
      if (m.flight.arrivalPlace) {
        visitedPlacesSet.add(m.flight.arrivalPlace.trim().toUpperCase());
      }
    }
  }
  const visitedPlaces = Array.from(visitedPlacesSet).sort();

  if (props.mode === "edit" && (!movementToEdit || !movementToEdit.flight)) {
    redirect("/logbook");
  }

  async function saveFlight(formData: FormData) {
    "use server";

    const user = await requireUser();
    const parsed = parseFlightFormData(formData);
    const bookingId = formData.get("bookingId") ? String(formData.get("bookingId")).trim() : null;
    const backTo = formData.get("backTo") ? String(formData.get("backTo")).trim() : null;
    const addBookingChecked = formData.get("addBooking") === "on";
    const bookingStartRaw = String(formData.get("bookingStartTime") ?? "").trim();
    const bookingEndRaw = String(formData.get("bookingEndTime") ?? "").trim();
    let partnershipId: string | null = null;

    const partnershipAircraft = partnershipAircrafts.find(a => a.registration === parsed.aircraftRegistration);

    async function upsertBooking(
      tx: Prisma.TransactionClient,
      aircraft: { id: string; partnershipId: string },
      ownerUserId: string
    ) {
      if (!bookingStartRaw || !bookingEndRaw) {
        throw new Error("Gli orari della prenotazione sono obbligatori.");
      }

      const startDateTime = parseRomeDateTime(bookingStartRaw);
      const endDateTime = parseRomeDateTime(bookingEndRaw);

      if (!startDateTime || !endDateTime || Number.isNaN(startDateTime.getTime()) || Number.isNaN(endDateTime.getTime())) {
        throw new Error("Orari prenotazione non validi.");
      }

      if (startDateTime >= endDateTime) {
        throw new Error("L'inizio della prenotazione deve precedere la fine.");
      }

      const overlapping = await tx.partnershipBooking.findFirst({
        where: {
          aircraftId: aircraft.id,
          ...(bookingId ? { id: { not: bookingId } } : {}),
          startTime: { lt: endDateTime },
          endTime: { gt: startDateTime },
        },
        include: { user: true },
      });

      if (overlapping) {
        const occupantName = overlapping.user.fullName || overlapping.user.email;
        throw new Error(`L'aereo è già prenotato da ${occupantName} nel periodo selezionato.`);
      }

      if (bookingId) {
        return tx.partnershipBooking.update({
          where: { id: bookingId },
          data: {
            aircraftId: aircraft.id,
            startTime: startDateTime,
            endTime: endDateTime,
            notes: parsed.notes,
          },
        });
      }

      return tx.partnershipBooking.create({
        data: {
          partnershipId: aircraft.partnershipId,
          userId: ownerUserId,
          aircraftId: aircraft.id,
          startTime: startDateTime,
          endTime: endDateTime,
          notes: parsed.notes,
        },
      });
    }

    if (props.mode === "create") {
      if (partnershipAircraft) {
        partnershipId = partnershipAircraft.partnershipId;
      }

      await prisma.$transaction(async (tx) => {
        // If it's a partnership flight, the movement amount only subtracts the instructor cost (if any)
        const movementAmount = partnershipAircraft ? -(parsed.instructorCost || 0) : parsed.movementAmount;

        let resolvedBookingId: string | null = bookingId;
        if (addBookingChecked && partnershipAircraft) {
          const booking = await upsertBooking(tx, partnershipAircraft, user.id);
          resolvedBookingId = booking.id;
        }

        const movement = await tx.movement.create({
          data: {
            userId: user.id,
            type: MovementType.FLIGHT,
            date: parsed.date,
            isDraft: parsed.isDraft,
            amount: movementAmount,
            notes: parsed.notes,
          },
        });

        await tx.flight.create({
          data: {
            movementId: movement.id,
            aircraftRegistration: parsed.aircraftRegistration,
            aircraftType: parsed.aircraftType,
            takeoffPlace: parsed.takeoffPlace,
            arrivalPlace: parsed.arrivalPlace,
            intermediatePlaces: parsed.intermediatePlaces,
            engineOn: parsed.engineOn,
            engineOff: parsed.engineOff,
            inputMode: parsed.inputMode,
            durationMinutes: parsed.durationMinutes,
            hobbsStartMinutes: parsed.hobbsStartMinutes,
            hobbsEndMinutes: parsed.hobbsEndMinutes,
            passengerName: parsed.passengerName,
            instructorName: parsed.instructorName,
            instructorMinutes: parsed.instructorMinutes,
            rentalRateApplied: parsed.rentalRateApplied,
            instructorRateApplied: parsed.instructorRateApplied,
            rentalCost: parsed.rentalCost,
            instructorCost: parsed.instructorCost,
            totalCost: parsed.totalCost,
            partnershipAircraftId: partnershipAircraft ? partnershipAircraft.id : null,
            bookingId: resolvedBookingId,
          },
        });
      });
    } else {
      const movementId = String(formData.get("movementId") ?? "");

      const dbMovement = await prisma.movement.findUnique({
        where: {
          id: movementId,
        },
        include: {
          flight: true,
        },
      });

      if (!dbMovement || dbMovement.type !== MovementType.FLIGHT || !dbMovement.flight) {
        throw new Error("Movimento non trovato.");
      }

      let isAuthorized = dbMovement.userId === user.id;
      if (!isAuthorized && dbMovement.flight.partnershipAircraftId) {
        const aircraft = await prisma.partnershipAircraft.findUnique({
          where: { id: dbMovement.flight.partnershipAircraftId },
          include: {
            partnership: {
              include: {
                members: true
              }
            }
          }
        });
        if (aircraft) {
          const member = aircraft.partnership.members.find(mem => mem.userId === user.id);
          if (member && member.role === "ADMIN") {
            isAuthorized = true;
            partnershipId = aircraft.partnershipId;
          }
        }
      }

      if (!isAuthorized) {
        throw new Error("Non autorizzato a modificare questo volo.");
      }

      if (dbMovement.flight.partnershipAircraftId && !partnershipId) {
        const aircraft = await prisma.partnershipAircraft.findUnique({
          where: { id: dbMovement.flight.partnershipAircraftId },
          select: { partnershipId: true }
        });
        if (aircraft) {
          partnershipId = aircraft.partnershipId;
        }
      }

      await prisma.$transaction(async (tx) => {
        const movementAmount = partnershipAircraft ? -(parsed.instructorCost || 0) : parsed.movementAmount;

        let resolvedBookingId: string | null = bookingId;
        if (addBookingChecked && partnershipAircraft) {
          const booking = await upsertBooking(tx, partnershipAircraft, dbMovement.userId);
          resolvedBookingId = booking.id;
        }

        await tx.flight.update({
          where: {
            movementId: dbMovement.id,
          },
          data: {
            aircraftRegistration: parsed.aircraftRegistration,
            aircraftType: parsed.aircraftType,
            takeoffPlace: parsed.takeoffPlace,
            arrivalPlace: parsed.arrivalPlace,
            intermediatePlaces: parsed.intermediatePlaces,
            engineOn: parsed.engineOn,
            engineOff: parsed.engineOff,
            inputMode: parsed.inputMode,
            durationMinutes: parsed.durationMinutes,
            hobbsStartMinutes: parsed.hobbsStartMinutes,
            hobbsEndMinutes: parsed.hobbsEndMinutes,
            passengerName: parsed.passengerName,
            instructorName: parsed.instructorName,
            instructorMinutes: parsed.instructorMinutes,
            rentalRateApplied: parsed.rentalRateApplied,
            instructorRateApplied: parsed.instructorRateApplied,
            rentalCost: parsed.rentalCost,
            instructorCost: parsed.instructorCost,
            totalCost: parsed.totalCost,
            partnershipAircraftId: partnershipAircraft ? partnershipAircraft.id : null,
            bookingId: resolvedBookingId,
          },
        });

        await tx.movement.update({
          where: { id: dbMovement.id },
          data: {
            date: parsed.date,
            isDraft: parsed.isDraft,
            amount: movementAmount,
            notes: parsed.notes,
          },
        });
      });
    }

    revalidatePath("/logbook");

    if (backTo) {
      redirect(backTo as any);
    } else {
      redirect("/logbook");
    }
  }

  const lastFlightMovement = movements
    .filter((m) => m.type === "FLIGHT" && m.flight)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  const initialRegistration = lastFlightMovement?.flight?.aircraftRegistration ?? "I-4150";
  const matchedRental = rentalAircrafts.find(a => a.registration === initialRegistration);
  const initialRentalRate = matchedRental ? Number(matchedRental.hourlyCost) : Number(settings?.rentalRatePerHour ?? 150);

  let title = "Nuovo volo";
  let subtitle =
    "Durata da orametro o inserimento manuale; costo calcolato automaticamente.";
  let initialValues: Partial<FlightFormValues> | undefined = {
    rentalRateApplied: String(initialRentalRate),
    instructorRateApplied: String(Number(settings?.instructorRatePerHour ?? 80)),
    takeoffPlace: settings?.defaultBase ?? "",
    isDraft: (props.mode === "create" && props.prefillIsDraft) || (movementToEdit?.isDraft ?? false),
    inputMode: "HOBBS",
    aircraftRegistration: initialRegistration,
    aircraftType: matchedRental ? matchedRental.type : (lastFlightMovement?.flight?.aircraftType ?? "P92"),
    date: (props.mode === "create" && props.prefillDate) ? props.prefillDate : undefined,
    notes: (props.mode === "create" && props.prefillNotes) ? props.prefillNotes : "",
  };
  let movementId: string | undefined = undefined;

  if (props.mode === "create" && booking) {
    title = "Registra volo da prenotazione";
    subtitle = "Completa la registrazione del volo effettuato con l'aereo della società.";
    
    const durationMinutes = Math.round((booking.endTime.getTime() - booking.startTime.getTime()) / 60000);
    const manualPrefill = splitMinutes(durationMinutes);
    
    const hourlyFuelCost = Number(booking.aircraft.hourlyFuelCost);
    const hourlyMaintCost = Number(booking.aircraft.hourlyMaintCost);
    const hourlyEngineFund = Number(booking.aircraft.hourlyEngineFund);
    const totalHourlyCost = hourlyFuelCost + hourlyMaintCost + hourlyEngineFund;

    initialValues = {
      date: formatDateTimeInput(booking.startTime),
      aircraftRegistration: booking.aircraft.registration,
      aircraftType: booking.aircraft.type,
      takeoffPlace: settings?.defaultBase ?? "",
      isDraft: booking.startTime > new Date(),
      inputMode: "MANUAL",
      manualHours: String(manualPrefill.hours),
      manualMinutes: String(manualPrefill.minutes),
      rentalRateApplied: String(totalHourlyCost),
      instructorRateApplied: String(Number(settings?.instructorRatePerHour ?? 80)),
      notes: booking.notes ? `Prenotazione: ${booking.notes}` : "Volo societario prenotato",
    };
  }

  if (props.mode === "edit" && movementToEdit?.flight) {
    title = "Modifica volo";
    subtitle = "Stesso form del nuovo volo, con dati precompilati.";
    movementId = movementToEdit.id;
    const defaultWarmupMinutes = defaultWarmupMinutesForDate(
      movementToEdit.date
    );

    initialValues = buildFlightInitialValues({
      movementDate: movementToEdit.date,
      notes: movementToEdit.notes,
      isDraft: movementToEdit.isDraft,
      flight: {
        inputMode: movementToEdit.flight.inputMode,
        aircraftRegistration: movementToEdit.flight.aircraftRegistration,
        aircraftType: movementToEdit.flight.aircraftType,
        takeoffPlace: movementToEdit.flight.takeoffPlace,
        arrivalPlace: movementToEdit.flight.arrivalPlace,
        intermediatePlaces: movementToEdit.flight.intermediatePlaces,
        engineOn: movementToEdit.flight.engineOn,
        engineOff: movementToEdit.flight.engineOff,
        passengerName: movementToEdit.flight.passengerName,
        instructorName: movementToEdit.flight.instructorName,
        instructorMinutes: movementToEdit.flight.instructorMinutes,
        warmupMinutes: movementToEdit.isDraft ? defaultWarmupMinutes : 0,
        durationMinutes:
          movementToEdit.flight.durationMinutes -
          (movementToEdit.isDraft ? defaultWarmupMinutes : 0),
        hobbsStartMinutes: movementToEdit.flight.hobbsStartMinutes,
        hobbsEndMinutes: movementToEdit.flight.hobbsEndMinutes,
        rentalRateApplied: Number(movementToEdit.flight.rentalRateApplied),
        instructorRateApplied: Number(movementToEdit.flight.instructorRateApplied),
      },
    });
  }

  const activeBooking = booking ?? linkedBooking;

  return (
    <AppShell title={title} subtitle={subtitle}>
      <FlightForm
        mode={props.mode}
        action={saveFlight}
        movementId={movementId}
        bookingId={activeBooking?.id}
        bookingWindow={
          activeBooking
            ? {
                startTime: formatDateTimeInput(activeBooking.startTime),
                endTime: formatDateTimeInput(activeBooking.endTime),
              }
            : undefined
        }
        currentBalance={currentBalance}
        totalFlightMinutes={totalFlightMinutes}
        dateBipoExam={settings?.dateBipoExam ?? null}
        initialValues={initialValues}
        partnershipAircrafts={partnershipAircrafts}
        rentalAircrafts={rentalAircrafts}
        visitedPlaces={visitedPlaces}
        backTo={props.backTo}
      />
    </AppShell>
  );
}
