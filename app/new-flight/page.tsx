import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import NewFlightForm from "./new-flight-form";

export default async function NewFlightPage() {
  const user = await requireUser();

  const movements = await prisma.movement.findMany({
    where: { userId: user.id },
    select: { amount: true },
  });

  const currentBalance = movements.reduce(
    (acc, item) => acc + Number(item.amount),
    0
  );

  return (
    <AppShell
      title="Nuovo volo"
      subtitle="Durata da orametro o inserimento manuale; costo calcolato automaticamente."
    >
      <NewFlightForm currentBalance={currentBalance} />
    </AppShell>
  );
}