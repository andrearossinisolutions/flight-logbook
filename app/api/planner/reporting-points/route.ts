import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { LOCAL_REPORTING_POINTS } from "@/lib/aeronautical-data";

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
      let rpUrl = `https://api.core.openaip.net/api/reporting-points?limit=500`;
      let navaidsUrl = `https://api.core.openaip.net/api/navaids?limit=500`;

      if (bbox) {
        rpUrl += `&bbox=${encodeURIComponent(bbox)}`;
        navaidsUrl += `&bbox=${encodeURIComponent(bbox)}`;
      } else {
        rpUrl += `&country=IT`;
        navaidsUrl += `&country=IT`;
      }

      // Fetch VFR points and IFR navaids/fixes in parallel
      const [rpRes, navRes] = await Promise.all([
        fetch(rpUrl, {
          headers: {
            "x-openaip-api-key": apiKey,
            "Accept": "application/json"
          },
          next: { revalidate: 300 } // Cache for 5 minutes
        }),
        fetch(navaidsUrl, {
          headers: {
            "x-openaip-api-key": apiKey,
            "Accept": "application/json"
          },
          next: { revalidate: 300 } // Cache for 5 minutes
        })
      ]);

      let formattedPoints: any[] = [];

      if (rpRes.ok) {
        const rpData = await rpRes.json();
        const rpItems = rpData.items || rpData.features || (Array.isArray(rpData) ? rpData : []);
        const vfrPoints = rpItems.map((item: any) => {
          const coords = item.geometry?.coordinates || [0, 0];
          return {
            id: item._id || String(Math.random()),
            name: item.name,
            code: item.code || item.name,
            lat: coords[1], // GeoJSON is [lon, lat]
            lon: coords[0],
            type: "VFR",
            description: item.description || `Punto di riporto VFR ${item.name}`
          };
        });
        formattedPoints = [...formattedPoints, ...vfrPoints];
      } else {
        console.warn("Failed to fetch reporting points from OpenAIP, status:", rpRes.status);
      }

      if (navRes.ok) {
        const navData = await navRes.json();
        const navItems = navData.items || navData.features || (Array.isArray(navData) ? navData : []);
        const ifrPoints = navItems.map((item: any) => {
          const coords = item.geometry?.coordinates || [0, 0];
          const codeName = item.code || item.name;
          
          let typeLabel = "IFR Fix";
          if (item.type === 1) typeLabel = "VOR";
          else if (item.type === 2) typeLabel = "NDB";
          else if (item.type === 10) typeLabel = "FIX";

          return {
            id: item._id || String(Math.random()),
            name: item.name,
            code: codeName,
            lat: coords[1],
            lon: coords[0],
            type: "IFR",
            description: item.description || `${typeLabel} - ${item.name}`
          };
        });
        formattedPoints = [...formattedPoints, ...ifrPoints];
      } else {
        console.warn("Failed to fetch navaids from OpenAIP, status:", navRes.status);
      }

      if (rpRes.ok || navRes.ok) {
        return NextResponse.json(formattedPoints);
      }
    } catch (err) {
      console.error("Error fetching aeronautical points from OpenAIP:", err);
    }
  }

  // Fallback to local high-quality mock data
  return NextResponse.json(LOCAL_REPORTING_POINTS);
}
