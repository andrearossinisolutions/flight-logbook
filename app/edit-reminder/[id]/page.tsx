import ReminderPageContent from "@/components/reminder-page-content";

export default async function EditReminderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <ReminderPageContent mode="edit" movementId={id} />;
}
