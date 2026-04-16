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
    redirect("/dashboard");
  }

  async function saveFlight(formData: FormData) {
    "use server";

    const user = await requireUser();
    const parsed = parseFlightFormData(formData);

    if (props.mode === "create") {
      await prisma.$transaction(async (tx) => {
        const movement = await tx.movement.create({
          data: {
            userId: user.id,
            type: MovementType.FLIGHT,
            date: parsed.date,
            isDraft: parsed.isDraft,
            amount: parsed.movementAmount,
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
          },
        });

        await tx.movement.update({
          where: { id: dbMovement.id },
          data: {
            date: parsed.date,
            isDraft: parsed.isDraft,
            amount: parsed.movementAmount,
            notes: parsed.notes,
          },
        });
      });
    }

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  let title = "Nuovo volo";
  let subtitle =
    "Durata da orametro o inserimento manuale; costo calcolato automaticamente.";
  let initialValues: Partial<FlightFormValues> | undefined = {
    rentalRateApplied: String(Number(settings?.rentalRatePerHour ?? 150)),
    instructorRateApplied: String(Number(settings?.instructorRatePerHour ?? 80)),
    takeoffPlace: settings?.defaultBase ?? "",
    isDraft: movementToEdit?.isDraft ?? false,
    inputMode: "HOBBS",
  };
  let movementId: string | undefined = undefined;

  if (props.mode === "edit" && movementToEdit?.flight) {
    title = "Modifica volo";
    subtitle = "Stesso form del nuovo volo, con dati precompilati.";
    movementId = movementToEdit.id;
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
        warmupMinutes: movementToEdit.isDraft ? 15 : 0,
        durationMinutes: movementToEdit.flight.durationMinutes - (movementToEdit.isDraft ? 15 : 0),
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
      />
    </AppShell>
  );
}
