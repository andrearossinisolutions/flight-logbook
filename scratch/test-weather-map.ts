import { ITALIAN_AIRPORTS } from "../lib/weather";

function testDateAndMapParams(icaoQuery: string, dateStr?: string) {
  console.log(`\nTesting with route: "${icaoQuery}", planned date: "${dateStr || 'NONE (current time)'}"`);
  
  // 1. Simulating Date Parsing
  let targetDate = new Date();
  if (dateStr && !isNaN(Date.parse(dateStr))) {
    targetDate = new Date(dateStr);
  }

  const formattedDateStr = targetDate.toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome"
  }) + " (Locali)";

  const vYear = targetDate.getUTCFullYear();
  const vMonth = (targetDate.getUTCMonth() + 1).toString().padStart(2, "0");
  const vDay = targetDate.getUTCDate().toString().padStart(2, "0");
  const vHour = targetDate.getUTCHours().toString().padStart(2, "0");
  const ventuskyTimeParam = `${vYear}${vMonth}${vDay}/${vHour}`;

  console.log(`  Formatted Date:    ${formattedDateStr}`);
  console.log(`  Ventusky Time:      ${ventuskyTimeParam}`);

  // 2. Simulating Midpoint and Zoom
  const defaultBase = "LIML";
  const baseApt = ITALIAN_AIRPORTS[defaultBase];
  const baseLat = baseApt?.lat ?? 45.461;
  const baseLon = baseApt?.lon ?? 9.263;

  let mapLat = baseLat;
  let mapLon = baseLon;
  let mapZoom = 8;

  // Split route tokens
  const tokens = icaoQuery.split(/[,/\-➔➔]/).map(t => t.trim().toUpperCase()).filter(Boolean);
  
  // Retrieve coordinates
  const stations = tokens.map(token => {
    const apt = ITALIAN_AIRPORTS[token];
    if (apt) {
      return { icao: token, lat: apt.lat, lon: apt.lon };
    }
    // Mock general coordinate for cecina or other cities if needed
    if (token === "CECINA") return { icao: token, lat: 43.310, lon: 10.512 };
    return null;
  }).filter((s): s is { icao: string; lat: number; lon: number } => s !== null);

  if (stations.length > 0) {
    const lats = stations.map(c => c.lat);
    const lons = stations.map(c => c.lon);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    
    mapLat = (minLat + maxLat) / 2;
    mapLon = (minLon + maxLon) / 2;

    const dLat = maxLat - minLat;
    const dLon = maxLon - minLon;
    const maxDelta = Math.max(dLat, dLon * Math.cos(mapLat * Math.PI / 180));

    if (maxDelta < 0.1) mapZoom = 11;
    else if (maxDelta < 0.5) mapZoom = 9;
    else if (maxDelta < 1.5) mapZoom = 8;
    else if (maxDelta < 3) mapZoom = 7;
    else if (maxDelta < 6) mapZoom = 6;
    else mapZoom = 5;
  }

  console.log(`  Map Center:        Lat ${mapLat.toFixed(3)}, Lon ${mapLon.toFixed(3)}`);
  console.log(`  Map Zoom:          ${mapZoom}`);
}

// Run test cases
testDateAndMapParams("LIML");
testDateAndMapParams("LIML - LIME", "2026-06-28T14:30:00.000Z");
testDateAndMapParams("LIML - LIPZ", "2026-12-25T08:00:00+01:00");
testDateAndMapParams("LIML - Cecina", "2026-06-26T09:15:00Z");
