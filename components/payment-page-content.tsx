import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import PaymentForm from "@/components/payment-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  buildPaymentInitialValues,
  parsePaymentFormData,
  type PaymentFormValues,
} from "@/lib/payment-form";

type PaymentPageContentProps =
  | { mode: "create" }
  | { mode: "edit"; movementId: string };

export default async function PaymentPageContent(
  props: PaymentPageContentProps
) {
  const user = await requireUser();

  const movements = await prisma.movement.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      amount: true,
      type: true,
      notes: true,
      date: true,
    },
  });

  const currentBalance = movements
    .filter((m) => m.type !== "SERVICE")
    .reduce((acc, item) => acc + Number(item.amount), 0);

  const rentalRatePerHour = Number(user.settings?.rentalRatePerHour ?? 150);
  const instructorRatePerHour = Number(user.settings?.instructorRatePerHour ?? 80);

  const movementToEdit =
    props.mode === "edit"
      ? movements.find(
          (m) =>
            m.id === props.movementId &&
            (m.type === "TOPUP" || m.type === "SERVICE")
        )
      : null;

  if (props.mode === "edit" && !movementToEdit) {
    notFound();
  }

  async function savePayment(formData: FormData) {
    "use server";

    const user = await requireUser();
    const parsed = parsePaymentFormData(formData);

    if (props.mode === "create") {
      await prisma.movement.create({
        data: {
          userId: user.id,
          type: parsed.movementType,
          date: parsed.date,
          isDraft: parsed.isDraft,
          amount: parsed.amount,
          notes: parsed.notes,
        },
      });
    } else {
      const movementId = String(formData.get("movementId") ?? "");

      const dbMovement = await prisma.movement.findFirst({
        where: {
          id: movementId,
          userId: user.id,
          type: { in: ["TOPUP", "SERVICE"] },
        },
      });

      if (!dbMovement) {
        throw new Error("Movimento non trovato.");
      }

      await prisma.movement.update({
        where: { id: dbMovement.id },
        data: {
          type: parsed.movementType,
          date: parsed.date,
          amount: parsed.amount,
          notes: parsed.notes,
        },
      });
    }

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  let title = "Nuovo pagamento";
  let subtitle =
    "Usa un importo positivo per una ricarica o un pagamento, e uno negativo per una rettifica.";
  let submitLabel = "Salva";
  let movementId: string | undefined = undefined;
  let initialValues: Partial<PaymentFormValues> | undefined = undefined;

  if (props.mode === "edit" && movementToEdit) {
    title = "Modifica pagamento";
    subtitle = "Stesso form del nuovo pagamento, con dati precompilati.";
    submitLabel = "Salva modifiche";
    movementId = movementToEdit.id;
    initialValues = buildPaymentInitialValues({
      movementType: movementToEdit.type as "TOPUP" | "SERVICE",
      date: movementToEdit.date,
      amount: Number(movementToEdit.amount),
      notes: movementToEdit.notes,
    });
  }

  return (
    <AppShell title={title} subtitle={subtitle}>
      <PaymentForm
        mode={props.mode}
        action={savePayment}
        movementId={movementId}
        currentBalance={currentBalance}
        rentalRatePerHour={rentalRatePerHour}
        instructorRatePerHour={instructorRatePerHour}
        initialValues={initialValues}
        submitLabel={submitLabel}
      />
    </AppShell>
  );
}