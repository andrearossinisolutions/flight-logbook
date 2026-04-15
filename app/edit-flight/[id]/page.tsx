import FlightPageContent from "@/components/flight-page-content";

export default async function EditFlightPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <FlightPageContent mode="edit" movementId={id} />;
}