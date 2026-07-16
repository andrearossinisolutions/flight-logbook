import FlightPageContent from "@/components/flight-page-content";

export default async function EditFlightPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ backTo?: string }>;
}) {
  const { id } = await params;
  const { backTo } = await searchParams;

  return <FlightPageContent mode="edit" movementId={id} backTo={backTo} />;
}