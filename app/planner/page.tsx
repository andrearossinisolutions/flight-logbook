import { requireUser } from "@/lib/require-user";
import { AppShell } from "@/components/app-shell";
import { redirect } from "next/navigation";
import PlannerMapWrapper from "@/components/planner-map-wrapper";
import { 
  resolveLocationToIcao, 
  getCoordinatesFromName, 
  ITALIAN_AIRPORTS 
} from "@/lib/weather";
import { LOCAL_AIRFIELDS } from "@/lib/aeronautical-data";

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
    const cleanBase = defaultBase.trim().toLowerCase();
    
    // 1. Check if the base name matches any local airfield (like Dovera, Bresso, Alzate Brianza)
    const localMatch = LOCAL_AIRFIELDS.find((fld) => {
      if (fld.icao && fld.icao.toLowerCase() === cleanBase) return true;
      if (fld.name.toLowerCase().includes(cleanBase)) return true;
      if (cleanBase.includes(fld.name.toLowerCase())) return true;
      return false;
    });

    if (localMatch) {
      centerLat = localMatch.lat;
      centerLon = localMatch.lon;
    } else {
      let resolvedRemote = false;
      const apiKey = process.env.OPENAIP_API_KEY;

      // 2. Try to query OpenAIP for matching airfield coordinates (globally/nationally)
      if (apiKey) {
        try {
          const searchUrl = `https://api.core.openaip.net/api/airports?search=${encodeURIComponent(defaultBase)}&limit=1`;
          const openaipRes = await fetch(searchUrl, {
            headers: {
              "x-openaip-api-key": apiKey,
              "Accept": "application/json"
            }
          });
          if (openaipRes.ok) {
            const searchData = await openaipRes.json();
            const items = searchData.items || [];
            if (items.length > 0) {
              const coords = items[0].geometry?.coordinates || [0, 0];
              centerLat = coords[1]; // GeoJSON is [lon, lat]
              centerLon = coords[0];
              resolvedRemote = true;
            }
          }
        } catch (err) {
          console.warn("OpenAIP airfield search resolution failed:", err);
        }
      }

      if (!resolvedRemote) {
        // 3. Fallback to geocoding location name directly (OSM town center)
        const coords = await getCoordinatesFromName(defaultBase);
        if (coords) {
          centerLat = coords.lat;
          centerLon = coords.lon;
        } else {
          // 4. Fallback to weather ICAO station
          const resolvedIcao = await resolveLocationToIcao(defaultBase);
          if (resolvedIcao && ITALIAN_AIRPORTS[resolvedIcao]) {
            centerLat = ITALIAN_AIRPORTS[resolvedIcao].lat;
            centerLon = ITALIAN_AIRPORTS[resolvedIcao].lon;
          }
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
