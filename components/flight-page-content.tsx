import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import FlightForm from "@/components/flight-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  buildFlightInitialValues,
  parseFlightFormData,
  type FlightFormValues,
} from "@/lib/flight-form";
import { defaultWarmupMinutesForDate } from "@/lib/utils";
import { MovementType } from "@prisma/client";

type FlightPageContentProps =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      movementId: string;
    };

export default async function FlightPageContent(
  props: FlightPageContentProps
) {
  const user = await requireUser();
  const settings = user.settings;

  const movements = await prisma.movement.findMany({
    where: { userId: user.id },
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

  const partnershipAircrafts = partnershipMemberships.flatMap(pm => pm.partnership.aircrafts).map(a => ({
    id: a.id,
    registration: a.registration,
    type: a.type,
    hourlyFuelCost: Number(a.hourlyFuelCost),
    hourlyMaintCost: Number(a.hourlyMaintCost),
    hourlyEngineFund: Number(a.hourlyEngineFund),
  }));

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

  const movementToEdit =
    props.mode === "edit"
      ? movements.find((m) => m.id === props.movementId && m.type === "FLIGHT")
      : null;

  if (props.mode === "edit" && (!movementToEdit || !movementToEdit.flight)) {
    redirect("/logbook");
  }

  async function saveFlight(formData: FormData) {
    "use server";

    const user = await requireUser();
    const parsed = parseFlightFormData(formData);

    if (props.mode === "create") {
      await prisma.$transaction(async (tx) => {
        const partnershipAircraft = partnershipAircrafts.find(a => a.registration === parsed.aircraftRegistration);
        
        // If it's a partnership flight, the movement amount only subtracts the instructor cost (if any)
        const movementAmount = partnershipAircraft ? -(parsed.instructorCost || 0) : parsed.movementAmount;

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
          },
        });
      });
    } else {
      const movementId = String(formData.get("movementId") ?? "");

      const dbMovement = await prisma.movement.findFirst({
        where: {
          id: movementId,
          userId: user.id,
          type: MovementType.FLIGHT,
        },
        include: {
          flight: true,
        },
      });

      if (!dbMovement || !dbMovement.flight) {
        throw new Error("Movimento non trovato.");
      }

      await prisma.$transaction(async (tx) => {
        const partnershipAircraft = partnershipAircrafts.find(a => a.registration === parsed.aircraftRegistration);
        const movementAmount = partnershipAircraft ? -(parsed.instructorCost || 0) : parsed.movementAmount;

        await tx.flight.update({
          where: {
            movementId: dbMovement.id,
          },
          data: {
            aircraftRegistration: parsed.aircraftRegistration,
            aircraftType: parsed.aircraftType,
            takeoffPlace: parsed.takeoffPlace,
            arrivalPlace: parsed.arrivalPlace,
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
    redirect("/logbook");
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
    isDraft: movementToEdit?.isDraft ?? false,
    inputMode: "HOBBS",
    aircraftRegistration: initialRegistration,
    aircraftType: matchedRental ? matchedRental.type : (lastFlightMovement?.flight?.aircraftType ?? "P92"),
  };
  let movementId: string | undefined = undefined;

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

  return (
    <AppShell title={title} subtitle={subtitle}>
      <FlightForm
        mode={props.mode}
        action={saveFlight}
        movementId={movementId}
        currentBalance={currentBalance}
        totalFlightMinutes={totalFlightMinutes}
        dateBipoExam={settings?.dateBipoExam ?? null}
        initialValues={initialValues}
        partnershipAircrafts={partnershipAircrafts}
        rentalAircrafts={rentalAircrafts}
      />
    </AppShell>
  );
}
