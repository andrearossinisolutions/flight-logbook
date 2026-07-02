import FlightPageContent from "@/components/flight-page-content";

export default async function NewFlightPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await searchParams;
  const bookingId = typeof resolvedParams.bookingId === "string" ? resolvedParams.bookingId : undefined;
  
  const prefillDate = typeof resolvedParams.prefillDate === "string" ? resolvedParams.prefillDate : undefined;
  const prefillNotes = typeof resolvedParams.prefillNotes === "string" ? resolvedParams.prefillNotes : undefined;
  const prefillIsDraft = resolvedParams.prefillIsDraft === "true";

  return (
    <FlightPageContent 
      mode="create" 
      bookingId={bookingId} 
      prefillDate={prefillDate}
      prefillNotes={prefillNotes}
      prefillIsDraft={prefillIsDraft}
    />
  );
}