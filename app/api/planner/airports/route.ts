import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { LOCAL_AIRFIELDS } from "@/lib/aeronautical-data";


function getAirportTypeLabel(type: any): string {
  const typeCode = Number(type);
  switch (typeCode) {
    case 1: return "MILITARY";
    case 2: return "CIVIL";
    case 3: return "CIVIL_MILITARY";
    case 4: return "HELI_CIVIL";
    case 5: return "AIRFIELD"; // Aviosuperficie
    case 6: return "GLIDER_SITE";
    case 7: return "ULTRALIGHT_STRIP"; // Campo volo
    case 8: return "HELI_MILITARY";
    default: return "AIRFIELD";
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
      let url = `https://api.core.openaip.net/api/airports?limit=300`;
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

        const formattedAirports = items.map((item: any) => {
          const coords = item.geometry?.coordinates || [0, 0];
          const elevValue = item.elevation?.value;
          const elevUnit = item.elevation?.unit === 1 ? "ft" : "m";
          const elevation = elevValue !== undefined ? `${elevValue} ${elevUnit}` : "N/D";

          return {
            id: item._id || String(Math.random()),
            name: item.name,
            icao: item.icaoCode || item.icao || "",
            lat: coords[1], // GeoJSON is [lon, lat]
            lon: coords[0],
            type: getAirportTypeLabel(item.type),
            elevation: elevation
          };
        });

        return NextResponse.json(formattedAirports);
      }
      console.warn("OpenAIP Airports API request failed with status:", res.status);
    } catch (err) {
      console.error("Error fetching airports from OpenAIP:", err);
    }
  }

  // Fallback to local high-quality mock data
  return NextResponse.json(LOCAL_AIRFIELDS);
}
