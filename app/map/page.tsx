import { Navbar } from "@/components/navbar";
import { getSessionFromCookie } from "@/lib/auth";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import type { Viewport } from "next";
import { buildMapData, getDistinctPassengers } from "@/lib/map-data";
import FlightMap from "@/components/flight-map";

export const dynamic = "force-dynamic";

// Solo su /map: la mappa arriva fino ai bordi e il pannello usa env(safe-area-inset-bottom)
export const viewport: Viewport = { viewportFit: "cover" };

interface MapPageProps {
  searchParams: Promise<{ openShare?: string; pairingCode?: string }>;
}

export default async function MapPage({ searchParams }: MapPageProps) {
  const { openShare, pairingCode } = await searchParams;
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }

  const user = await requireUser();
  const settings = user.settings;

  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  const { points, routes, gpxTracks, hasBase } = await buildMapData(user.id, { includeFuturePlans: true, includeGpxDetails: true });
  const knownPassengers = await getDistinctPassengers(user.id);

  return (
    <div className="map-page-root" style={{ position: "relative", width: "100vw", overflow: "hidden" }}>
      {/* Barra di navigazione flottante sopra la mappa */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <Navbar isLoggedIn={true} />
      </div>

      {/* Mappa a tutto schermo (si estende dietro la barra di navigazione) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
        <FlightMap
          points={points}
          routes={routes}
          gpxTracks={gpxTracks}
          hasBase={hasBase}
          knownPassengers={knownPassengers}
          autoOpenShareMenu={openShare === "1"}
          pairingCode={pairingCode}
        />
      </div>
    </div>
  );
}
