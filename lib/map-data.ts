import { prisma } from "@/lib/prisma";
import { getCoordinatesFromName, ITALIAN_AIRPORTS, PLACE_TO_METAR } from "@/lib/weather";
import { parseGpxTrackPoints, downsamplePoints } from "@/lib/gpx";
import type { MapPoint, MapRoute, MapGpxTrack } from "@/components/flight-map-inner";

export interface MapDataOptions {
  includeFuturePlans: boolean;
  passengerFilter?: string[] | null;
}

async function resolveCoords(
  name: string,
  customLocations: Array<{ name: string; lat: number; lon: number }>
): Promise<{ lat: number; lon: number } | null> {
  const cleanName = name.trim().toUpperCase();
  if (!cleanName) return null;

  const custom = customLocations.find((loc) => loc.name === cleanName);
  if (custom) {
    return { lat: custom.lat, lon: custom.lon };
  }

  if (ITALIAN_AIRPORTS[cleanName]) {
    return { lat: ITALIAN_AIRPORTS[cleanName].lat, lon: ITALIAN_AIRPORTS[cleanName].lon };
  }

  const geo = await getCoordinatesFromName(name);
  if (geo) {
    return { lat: geo.lat, lon: geo.lon };
  }

  const lowerName = name.trim().toLowerCase();
  const mappedIcao = PLACE_TO_METAR[lowerName];
  if (mappedIcao && ITALIAN_AIRPORTS[mappedIcao]) {
    return { lat: ITALIAN_AIRPORTS[mappedIcao].lat, lon: ITALIAN_AIRPORTS[mappedIcao].lon };
  }

  return null;
}

export async function buildMapData(userId: string, options: MapDataOptions) {
  const { includeFuturePlans, passengerFilter } = options;
  const normalizedPassengerFilter = (passengerFilter || [])
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const customLocations = await prisma.customLocation.findMany({ where: { userId } });

  const settings = await prisma.settings.findUnique({ where: { userId } });
  const baseName = settings?.defaultBase || null;
  const baseKey = baseName ? baseName.trim().toUpperCase() : null;

  const allMovements = await prisma.movement.findMany({
    where: { userId, type: "FLIGHT" },
    include: { flight: { include: { gpxFiles: true } } },
  });

  // Rispetta sempre l'opzione "includi pianificazioni future" e, se presente, il filtro passeggeri
  const movements = allMovements.filter((m) => {
    if (!m.flight) return false;
    if (m.isDraft && !includeFuturePlans) return false;

    if (normalizedPassengerFilter.length > 0) {
      const passenger = m.flight.passengerName?.trim().toLowerCase() || "";
      if (!normalizedPassengerFilter.includes(passenger)) return false;
    }

    return true;
  });

  interface PlaceStats {
    name: string;
    flightCount: number;
    draftFlightCount: number;
    lastVisit: Date | null;
  }

  const statsMap = new Map<string, PlaceStats>();

  movements.forEach((m) => {
    if (!m.flight) return;

    const dep = m.flight.takeoffPlace ? m.flight.takeoffPlace.trim().toUpperCase() : "";
    const arr = m.flight.arrivalPlace ? m.flight.arrivalPlace.trim().toUpperCase() : "";
    const inter = m.flight.intermediatePlaces
      ? m.flight.intermediatePlaces.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];

    const places = new Set<string>();
    if (dep) places.add(dep);
    for (const p of inter) places.add(p);
    if (arr) places.add(arr);

    places.forEach((place) => {
      const stats = statsMap.get(place) || {
        name: place,
        flightCount: 0,
        draftFlightCount: 0,
        lastVisit: null,
      };
      if (m.isDraft) {
        stats.draftFlightCount += 1;
      } else {
        stats.flightCount += 1;
        if (!stats.lastVisit || m.date > stats.lastVisit) {
          stats.lastVisit = m.date;
        }
      }
      statsMap.set(place, stats);
    });
  });

  if (baseKey && !statsMap.has(baseKey)) {
    statsMap.set(baseKey, {
      name: baseKey,
      flightCount: 0,
      draftFlightCount: 0,
      lastVisit: null,
    });
  }

  const pointsPromise = Array.from(statsMap.entries()).map(async ([key, stats]) => {
    const coords = await resolveCoords(stats.name, customLocations);
    if (!coords) return null;

    const custom = customLocations.find((loc) => loc.name === key);

    return {
      name: stats.name,
      lat: coords.lat,
      lon: coords.lon,
      isBase: key === baseKey,
      flightCount: stats.flightCount,
      draftFlightCount: stats.draftFlightCount,
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

  const coordsMap = new Map<string, { lat: number; lon: number }>();
  points.forEach((p) => {
    coordsMap.set(p.name.toUpperCase(), { lat: p.lat, lon: p.lon });
  });

  const routesMap = new Map<
    string,
    {
      from: string;
      to: string;
      fromCoords: { lat: number; lon: number };
      toCoords: { lat: number; lon: number };
      count: number;
      draftCount: number;
      isDraft?: boolean;
    }
  >();

  const gpxTracks: MapGpxTrack[] = [];

  movements.forEach((m) => {
    if (!m.flight) return;
    const dep = m.flight.takeoffPlace ? m.flight.takeoffPlace.trim().toUpperCase() : "";
    const arr = m.flight.arrivalPlace ? m.flight.arrivalPlace.trim().toUpperCase() : "";
    const inter = m.flight.intermediatePlaces
      ? m.flight.intermediatePlaces.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)
      : [];

    const pathPlaces = [dep, ...inter, arr].filter(Boolean);

    // Se per questo volo sono stati caricati dei GPX, disegniamo il tragitto reale
    // registrato al posto delle linee rette tra le tappe: niente aggregazione per
    // coppia di luoghi, solo i pin restano a indicare partenza/tappe/arrivo.
    if (m.flight.gpxFiles.length > 0) {
      const filesWithPoints = m.flight.gpxFiles
        .map((f) => parseGpxTrackPoints(Buffer.from(f.content).toString("utf8")))
        .filter((pts) => pts.length > 0);

      filesWithPoints.sort((a, b) => {
        const aTime = a.find((p) => p.time)?.time?.getTime() ?? 0;
        const bTime = b.find((p) => p.time)?.time?.getTime() ?? 0;
        return aTime - bTime;
      });

      const allPoints = filesWithPoints.flat();
      if (allPoints.length > 1) {
        const path = downsamplePoints(
          allPoints.map((p) => [p.lat, p.lon] as [number, number]),
          400
        );
        gpxTracks.push({ path, isDraft: m.isDraft });
      }

      return;
    }

    for (let i = 0; i < pathPlaces.length - 1; i++) {
      const fromPlace = pathPlaces[i];
      const toPlace = pathPlaces[i + 1];

      if (fromPlace && toPlace && fromPlace !== toPlace) {
        const fromCoords = coordsMap.get(fromPlace);
        const toCoords = coordsMap.get(toPlace);

        if (fromCoords && toCoords) {
          const key = [fromPlace, toPlace].sort().join("-");
          const existing = routesMap.get(key);
          if (existing) {
            if (m.isDraft) {
              existing.draftCount += 1;
            } else {
              existing.count += 1;
              existing.isDraft = false;
            }
          } else {
            routesMap.set(key, {
              from: fromPlace,
              to: toPlace,
              fromCoords,
              toCoords,
              count: m.isDraft ? 0 : 1,
              draftCount: m.isDraft ? 1 : 0,
              isDraft: m.isDraft,
            });
          }
        }
      }
    }
  });

  const routes = Array.from(routesMap.values()) as MapRoute[];

  return { points, routes, gpxTracks, hasBase: !!baseName };
}

export async function getDistinctPassengers(userId: string): Promise<string[]> {
  const flights = await prisma.flight.findMany({
    where: { movement: { userId } },
    select: { passengerName: true },
  });

  const set = new Set<string>();
  for (const f of flights) {
    if (f.passengerName && f.passengerName.trim()) {
      set.add(f.passengerName.trim());
    }
  }
  return Array.from(set).sort();
}
