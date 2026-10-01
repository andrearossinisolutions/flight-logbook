import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { buildMapData } from "@/lib/map-data";
import PublicFlightMap from "@/components/public-flight-map";

export const dynamic = "force-dynamic";

interface PublicMapPageProps {
  params: Promise<{ token: string }>;
}

export default async function PublicMapPage({ params }: PublicMapPageProps) {
  const { token } = await params;

  const link = await prisma.mapShareLink.findUnique({ where: { token } });
  if (!link) {
    notFound();
  }

  const passengerFilter = link.passengerFilter
    ? link.passengerFilter.split(",").map((p: string) => p.trim()).filter(Boolean)
    : null;

  const { points, routes, gpxTracks } = await buildMapData(link.userId, {
    includeFuturePlans: link.includeFuturePlans,
    passengerFilter,
  });

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      <PublicFlightMap token={token} points={points} routes={routes} gpxTracks={gpxTracks} />
    </div>
  );
}
