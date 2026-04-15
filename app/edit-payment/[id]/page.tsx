import PaymentPageContent from "@/components/payment-page-content";

export default async function EditTopupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <PaymentPageContent mode="edit" movementId={id} />;
}