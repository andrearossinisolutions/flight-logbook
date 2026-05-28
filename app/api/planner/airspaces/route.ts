import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { LOCAL_AIRSPACES } from "@/lib/aeronautical-data";

function parseCoordinates(geometry: any): [number, number][] {
  if (!geometry) return [];
  const coords = geometry.coordinates;
  if (!Array.isArray(coords) || !coords.length) return [];

  let ring: any[] | null = null;

  if (
    Array.isArray(coords[0]) &&
    Array.isArray(coords[0][0]) &&
    typeof coords[0][0][0] === "number"
  ) {
    ring = coords[0];
  } else if (Array.isArray(coords[0]) && typeof coords[0][0] === "number") {
    ring = coords;
  } else if (
    Array.isArray(coords[0]) &&
    Array.isArray(coords[0][0]) &&
    Array.isArray(coords[0][0][0])
  ) {
    ring = coords[0][0];
  }

  if (!ring) return [];

  const out: [number, number][] = [];

  for (const p of ring) {
    if (!Array.isArray(p) || p.length < 2) continue;
    const lon = Number(p[0]);
    const lat = Number(p[1]);
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
    out.push([lat, lon]); // Leaflet is [lat, lon]
  }

  return out;
}

function formatLimit(limit: any): string {
  if (!limit) return "GND";
  const value = limit.value;
  const unit = limit.unit; // 1: Feet, 6: FL, 2: Meters
  const ref = limit.referencePoint; // 1: MSL, 2: AGL

  if (value === 0 && (ref === 1 || ref === 2)) return "GND";

  let unitStr = "ft";
  if (unit === 6) {
    return `FL${value}`;
  } else if (unit === 2) {
    unitStr = "m";
  }

  let refStr = "";
  if (ref === 1) refStr = " AMSL";
  else if (ref === 2) refStr = " AGL";

  return `${value}${unitStr}${refStr}`;
}

function getAirspaceTypeLabel(type: any): string {
  const typeCode = Number(type);
  switch (typeCode) {
    case 2: return "DANGER";
    case 3: return "PROHIBITED";
    case 4: return "CTR";
    case 13: return "ATZ";
    case 14: return "MATZ";
    default: return "CTR";
  }
}

export async function GET(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const bbox = searchParams.get("bbox");
  const apiKey = process.env.OPENAIP_API_KEY;

  if (apiKey) {
    try {
      let url = `https://api.core.openaip.net/api/airspaces?limit=500`;
      if (bbox) {
        url += `&bbox=${encodeURIComponent(bbox)}`;
      } else {
        url += `&country=IT`;
      }

      const res = await fetch(url, {
        headers: {
          "x-openaip-api-key": apiKey,
          "Accept": "application/json"
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      });

      if (res.ok) {
        const data = await res.json();
        const items = data.items || data.features || (Array.isArray(data) ? data : []);

        const formattedAirspaces = items.map((item: any) => {
          const coords = parseCoordinates(item.geometry);
          return {
            id: item._id || String(Math.random()),
            name: item.name,
            class: item.class || "G",
            type: getAirspaceTypeLabel(item.type),
            lowerLimit: formatLimit(item.lowerLimit),
            upperLimit: formatLimit(item.upperLimit),
            coordinates: coords
          };
        }).filter((item: any) => item.coordinates.length > 0);

        return NextResponse.json(formattedAirspaces);
      }
      console.warn("OpenAIP API request failed with status:", res.status);
    } catch (err) {
      console.error("Error fetching airspaces from OpenAIP:", err);
    }
  }

  // Fallback to local high-quality mock data
  return NextResponse.json(LOCAL_AIRSPACES);
}
