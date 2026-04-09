import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import NewTopupForm from "./new-topup-form";

export default async function NewTopupPage() {
  const user = await requireUser();

  const movements = await prisma.movement.findMany({
    where: { userId: user.id },
    select: { amount: true },
  });

  const currentBalance = movements.reduce(
    (acc, item) => acc + Number(item.amount),
    0
  );

  const rentalRatePerHour = Number(user.settings?.rentalRatePerHour ?? 150);
  const instructorRatePerHour = Number(user.settings?.instructorRatePerHour ?? 80);

  async function createTopup(formData: FormData) {
    "use server";

    const user = await requireUser();

    const dateRaw = String(formData.get("date") ?? "");
    const amountRaw = String(formData.get("amount") ?? "");
    const notesRaw = String(formData.get("notes") ?? "");

    const amount = Number(amountRaw);

    if (!dateRaw) {
      throw new Error("La data è obbligatoria.");
    }

    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error("L'importo deve essere diverso da zero.");
    }

    await prisma.movement.create({
      data: {
        userId: user.id,
        type: "TOPUP",
        date: new Date(dateRaw),
        amount,
        notes: notesRaw.trim() || null,
      },
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="Nuovo movimento saldo"
      subtitle="Usa un importo positivo per una ricarica, negativo per una rettifica/addebito."
    >
      <NewTopupForm
        action={createTopup}
        currentBalance={currentBalance}
        rentalRatePerHour={rentalRatePerHour}
        instructorRatePerHour={instructorRatePerHour}
      />
    </AppShell>
  );
}