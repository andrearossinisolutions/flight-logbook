import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import ReminderForm from "@/components/reminder-form";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";
import {
  buildReminderInitialValues,
  parseReminderFormData,
  type ReminderFormValues,
} from "@/lib/reminder-form";

type ReminderPageContentProps =
  | { mode: "create" }
  | { mode: "edit"; movementId: string };

export default async function ReminderPageContent(props: ReminderPageContentProps) {
  const user = await requireUser();

  const movementToEdit =
    props.mode === "edit"
      ? await prisma.movement.findFirst({
          where: {
            id: props.movementId,
            userId: user.id,
            type: "REMINDER",
          },
        })
      : null;

  if (props.mode === "edit" && !movementToEdit) {
    notFound();
  }

  async function saveReminder(formData: FormData) {
    "use server";

    const user = await requireUser();
    const parsed = parseReminderFormData(formData);

    if (props.mode === "create") {
      await prisma.movement.create({
        data: {
          userId: user.id,
          type: "REMINDER",
          date: parsed.date,
          amount: 0,
          isDraft: false,
          notes: parsed.notes,
        },
      });
    } else {
      const movementId = String(formData.get("movementId") ?? "");

      const dbMovement = await prisma.movement.findFirst({
        where: {
          id: movementId,
          userId: user.id,
          type: "REMINDER",
        },
      });

      if (!dbMovement) {
        throw new Error("Movimento non trovato.");
      }

      await prisma.movement.update({
        where: { id: dbMovement.id },
        data: {
          date: parsed.date,
          notes: parsed.notes,
        },
      });
    }

    revalidatePath("/logbook");
    redirect("/logbook");
  }

  let title = "Nuovo promemoria";
  let subtitle = "Imposta un promemoria per scadenze amministrative o altri eventi.";
  let submitLabel = "Salva promemoria";
  let movementId: string | undefined = undefined;
  let initialValues: Partial<ReminderFormValues> | undefined = undefined;

  if (props.mode === "edit" && movementToEdit) {
    title = "Modifica promemoria";
    subtitle = "Modifica la data, l'orario o il testo del tuo promemoria.";
    submitLabel = "Salva modifiche";
    movementId = movementToEdit.id;
    initialValues = buildReminderInitialValues({
      date: movementToEdit.date,
      notes: movementToEdit.notes,
    });
  }

  return (
    <AppShell title={title} subtitle={subtitle}>
      <ReminderForm
        mode={props.mode}
        action={saveReminder}
        movementId={movementId}
        initialValues={initialValues}
        submitLabel={submitLabel}
      />
    </AppShell>
  );
}
