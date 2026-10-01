import { Navbar } from "@/components/navbar";
import { getSessionFromCookie } from "@/lib/auth";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { buildMapData, getDistinctPassengers } from "@/lib/map-data";
import FlightMap from "@/components/flight-map";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }

  const user = await requireUser();
  const settings = user.settings;

  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  const { points, routes, hasBase } = await buildMapData(user.id, { includeFuturePlans: true });
  const knownPassengers = await getDistinctPassengers(user.id);

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden" }}>
      {/* Barra di navigazione flottante sopra la mappa */}
      <div style={{ position: "relative", zIndex: 10 }}>
        <Navbar isLoggedIn={true} />
      </div>

      {/* Mappa a tutto schermo (si estende dietro la barra di navigazione) */}
      <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 1 }}>
        <FlightMap points={points} routes={routes} hasBase={hasBase} knownPassengers={knownPassengers} />
      </div>
    </div>
  );
}
