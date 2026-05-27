import { extractLocationsFromText, resolveLocationToIcao, PLACE_TO_METAR } from "../lib/weather";

async function debug() {
  const text = "Cecina (aviosuperficie)";
  console.log("Debugging text:", text);
  
  // Let's mimic extractLocationsFromText manually
  let parts = text.split(/[-➔➔,]/i).map(p => p.trim()).filter(Boolean);
  console.log("Initial parts:", parts);
  
  if (parts.length === 1) {
    let tempText = text.toLowerCase();
    const foundKeys: string[] = [];
    for (const place of Object.keys(PLACE_TO_METAR)) {
      if (tempText.includes(place)) {
        foundKeys.push(place);
        tempText = tempText.replace(place, "");
      }
    }
    console.log("Found keys in PLACE_TO_METAR:", foundKeys);
    if (foundKeys.length > 0) {
      parts = foundKeys;
    } else {
      parts = text.split(/\s+/).map(p => p.trim()).filter(Boolean);
      console.log("Split by whitespace:", parts);
    }
  }

  const resolved: string[] = [];
  for (const part of parts) {
    if (part.length < 3) {
      console.log(`Skipping part "${part}" because length < 3`);
      continue;
    }
    const icao = await resolveLocationToIcao(part);
    console.log(`Part "${part}" resolved to ICAO:`, icao);
    if (icao) {
      resolved.push(icao);
    }
  }
  
  console.log("Unique resolved:", Array.from(new Set(resolved)));
}

debug();
