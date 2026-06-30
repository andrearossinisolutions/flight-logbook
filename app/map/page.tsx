import { Navbar } from "@/components/navbar";
import { getSessionFromCookie } from "@/lib/auth";
import { requireUser } from "@/lib/require-user";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCoordinatesFromName, ITALIAN_AIRPORTS, PLACE_TO_METAR } from "@/lib/weather";
import FlightMap from "@/components/flight-map";
import type { MapPoint, MapRoute } from "@/components/flight-map";

export const dynamic = "force-dynamic";

async function resolveCoords(
  name: string,
  customLocations: Array<{ name: string; lat: number; lon: number }>
): Promise<{ lat: number; lon: number } | null> {
  const cleanName = name.trim().toUpperCase();
  if (!cleanName) return null;

  // 1. Controlla prima le località personalizzate impostate dall'utente (massima priorità)
  const custom = customLocations.find((loc) => loc.name === cleanName);
  if (custom) {
    return {
      lat: custom.lat,
      lon: custom.lon,
    };
  }

  // 2. Controlla in ITALIAN_AIRPORTS (es. Linate, Malpensa, ecc. tramite codice ICAO esatto)
  if (ITALIAN_AIRPORTS[cleanName]) {
    return {
      lat: ITALIAN_AIRPORTS[cleanName].lat,
      lon: ITALIAN_AIRPORTS[cleanName].lon,
    };
  }

  // 3. Controlla la posizione geografica reale tramite Nominatim / OpenStreetMap
  const geo = await getCoordinatesFromName(name);
  if (geo) {
    return {
      lat: geo.lat,
      lon: geo.lon,
    };
  }

  // 4. Come ultima risorsa, controlla se è associato a una stazione METAR nota (PLACE_TO_METAR)
  const lowerName = name.trim().toLowerCase();
  const mappedIcao = PLACE_TO_METAR[lowerName];
  if (mappedIcao && ITALIAN_AIRPORTS[mappedIcao]) {
    return {
      lat: ITALIAN_AIRPORTS[mappedIcao].lat,
      lon: ITALIAN_AIRPORTS[mappedIcao].lon,
    };
  }

  return null;
}

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

  const customLocations = await prisma.customLocation.findMany({
    where: { userId: user.id },
  });

  const baseName = settings?.defaultBase || null;
  const baseKey = baseName ? baseName.trim().toUpperCase() : null;

  // Carica i movimenti di tipo FLIGHT
  const movements = await prisma.movement.findMany({
    where: {
      userId: user.id,
      type: "FLIGHT",
    },
    include: {
      flight: true,
    },
  });

  interface PlaceStats {
    name: string;
    takeoffCount: number;
    arrivalCount: number;
    lastVisit: Date | null;
  }

  const statsMap = new Map<string, PlaceStats>();

  movements.forEach((m) => {
    if (!m.flight) return;

    const dep = m.flight.takeoffPlace ? m.flight.takeoffPlace.trim().toUpperCase() : "";
    if (dep) {
      const stats = statsMap.get(dep) || {
        name: dep,
        takeoffCount: 0,
        arrivalCount: 0,
        lastVisit: null,
      };
      stats.takeoffCount += 1;
      if (!stats.lastVisit || m.date > stats.lastVisit) {
        stats.lastVisit = m.date;
      }
      statsMap.set(dep, stats);
    }

    const arr = m.flight.arrivalPlace ? m.flight.arrivalPlace.trim().toUpperCase() : "";
    if (arr) {
      const stats = statsMap.get(arr) || {
        name: arr,
        takeoffCount: 0,
        arrivalCount: 0,
        lastVisit: null,
      };
      stats.arrivalCount += 1;
      if (!stats.lastVisit || m.date > stats.lastVisit) {
        stats.lastVisit = m.date;
      }
      statsMap.set(arr, stats);
    }
  });

  // Assicurati che la base sia presente nella mappa, anche se non ha voli associati
  if (baseKey && !statsMap.has(baseKey)) {
    statsMap.set(baseKey, {
      name: baseKey,
      takeoffCount: 0,
      arrivalCount: 0,
      lastVisit: null,
    });
  }

  // Risoluzione parallela delle coordinate
  const pointsPromise = Array.from(statsMap.entries()).map(async ([key, stats]) => {
    const coords = await resolveCoords(stats.name, customLocations);
    if (!coords) return null;

    const custom = customLocations.find((loc) => loc.name === key);

    return {
      name: stats.name,
      lat: coords.lat,
      lon: coords.lon,
      isBase: key === baseKey,
      takeoffCount: stats.takeoffCount,
      arrivalCount: stats.arrivalCount,
      address: custom?.address || null,
      hasOverride: !!custom,
      lastVisit: stats.lastVisit
        ? stats.lastVisit.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : null,
    } as MapPoint;
  });

  const points = (await Promise.all(pointsPromise)).filter(Boolean) as MapPoint[];

  // Costruisci una mappa delle coordinate per la risoluzione rapida delle rotte
  const coordsMap = new Map<string, { lat: number; lon: number }>();
  points.forEach((p) => {
    coordsMap.set(p.name.toUpperCase(), { lat: p.lat, lon: p.lon });
  });

  // Calcola le rotte uniche
  const routesMap = new Map<
    string,
    {
      from: string;
      to: string;
      fromCoords: { lat: number; lon: number };
      toCoords: { lat: number; lon: number };
      count: number;
    }
  >();

  movements.forEach((m) => {
    if (!m.flight) return;
    const dep = m.flight.takeoffPlace ? m.flight.takeoffPlace.trim().toUpperCase() : "";
    const arr = m.flight.arrivalPlace ? m.flight.arrivalPlace.trim().toUpperCase() : "";

    if (dep && arr && dep !== arr) {
      const depCoords = coordsMap.get(dep);
      const arrCoords = coordsMap.get(arr);

      if (depCoords && arrCoords) {
        // Consideriamo la rotta come bidirezionale (ordinando alfabeticamente)
        const key = [dep, arr].sort().join("-");
        const existing = routesMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          routesMap.set(key, {
            from: dep,
            to: arr,
            fromCoords: depCoords,
            toCoords: arrCoords,
            count: 1,
          });
        }
      }
    }
  });

  const routes = Array.from(routesMap.values()) as MapRoute[];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      <Navbar isLoggedIn={true} />
      <div
        style={{
          flex: 1,
          padding: "0 24px 24px 24px",
          maxWidth: "1100px",
          width: "100%",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <h1 style={{ margin: "0 0 4px 0", fontSize: "1.8rem" }}>Mappa dei Voli</h1>
          <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
            Visualizza la tua base operativa ed esplora tutte le destinazioni e le rotte che hai volato.
          </p>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }}>
          <FlightMap points={points} routes={routes} />
        </div>
      </div>
    </div>
  );
}
