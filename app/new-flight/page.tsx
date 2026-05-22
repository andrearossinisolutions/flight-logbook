import FlightPageContent from "@/components/flight-page-content";

export default async function NewFlightPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const bookingId = typeof resolvedParams.bookingId === "string" ? resolvedParams.bookingId : undefined;

  return <FlightPageContent mode="create" bookingId={bookingId} />;
}