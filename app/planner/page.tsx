import { requireUser } from "@/lib/require-user";
import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";
import PlannerMapWrapper from "@/components/planner-map-wrapper";
import { 
  resolveLocationToIcao, 
  getCoordinatesFromName, 
  ITALIAN_AIRPORTS 
} from "@/lib/weather";

export default async function PlannerPage() {
  const user = await requireUser();
  const settings = user.settings;

  // Onboarding verification
  if (!settings?.onboardingCompleted) {
    redirect("/onboarding");
  }

  const defaultBase = settings?.defaultBase || "LIML";
  
  // Resolve base coordinates
  let centerLat = 45.461; // Milano Linate default
  let centerLon = 9.263;

  try {
    // 1. Try to get coordinates of the location name directly from OSM/Nominatim (e.g., "Dovera")
    const coords = await getCoordinatesFromName(defaultBase);
    if (coords) {
      centerLat = coords.lat;
      centerLon = coords.lon;
    } else {
      // 2. If name lookup fails, check if the string is a direct ICAO code
      const upperBase = defaultBase.trim().toUpperCase();
      if (ITALIAN_AIRPORTS[upperBase]) {
        centerLat = ITALIAN_AIRPORTS[upperBase].lat;
        centerLon = ITALIAN_AIRPORTS[upperBase].lon;
      } else {
        // 3. Fallback to resolving via weather station ICAO
        const resolvedIcao = await resolveLocationToIcao(defaultBase);
        if (resolvedIcao && ITALIAN_AIRPORTS[resolvedIcao]) {
          centerLat = ITALIAN_AIRPORTS[resolvedIcao].lat;
          centerLon = ITALIAN_AIRPORTS[resolvedIcao].lon;
        }
      }
    }
  } catch (err) {
    console.error("Error resolving home base coordinates:", err);
  }

  return (
    <AppShell
      title="Planner Rotte e Spazio Aereo"
      subtitle="Visualizzazione interattiva su carta degli spazi aerei CTR/TMA e dei punti di riporto VFR e IFR."
    >
      <div 
        className="card" 
        style={{ 
          height: "calc(100vh - 200px)", 
          minHeight: "550px", 
          padding: 0, 
          overflow: "hidden",
          border: "1px solid var(--border)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)"
        }}
      >
        <PlannerMapWrapper 
          centerLat={centerLat} 
          centerLon={centerLon} 
          defaultBase={defaultBase} 
        />
      </div>
    </AppShell>
  );
}
