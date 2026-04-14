import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import NewFlightForm from "./new-flight-form";

export default async function NewFlightPage() {
  const user = await requireUser();
  const settings = user.settings;

  const movements = await prisma.movement.findMany({
    where: { userId: user.id },
    select: { amount: true, flight: true, type: true },
  });

  const currentBalance = movements
    .filter((m) => m.type !== "SERVICE")
    .reduce(
      (acc, item) => acc + Number(item.amount),
      0
    );

  type MovementItem = (typeof movements)[number];

  const totalFlightMinutes = movements.reduce(
    (acc: number, item: MovementItem) => acc + (item.flight?.durationMinutes ?? 0),
    0
  );

  return (
    <AppShell
      title="Nuovo volo"
      subtitle="Durata da orametro o inserimento manuale; costo calcolato automaticamente."
    >
      <NewFlightForm currentBalance={currentBalance} totalFlightMinutes={totalFlightMinutes} dateBipoExam={settings?.dateBipoExam ?? null} />
    </AppShell>
  );
}