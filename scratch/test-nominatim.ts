import { getCoordinatesFromName, findNearestIcao } from "../lib/weather";

async function testNominatim() {
  const queries = [
    "Il Gabbiano",
    "Aviosuperficie Il Gabbiano",
    "Il Gabbiano Cecina",
    "Aviosuperficie Il Gabbiano Cecina",
    "Cecina",
    "Dovera",
    "Valle Gaffaro",
    "Aviosuperficie Valle Gaffaro"
  ];

  for (const q of queries) {
    const coords = await getCoordinatesFromName(q);
    if (coords) {
      const nearest = findNearestIcao(coords.lat, coords.lon);
      console.log(`Query: "${q}" -> Coords: (${coords.lat}, ${coords.lon}) -> Nearest METAR: ${nearest}`);
    } else {
      console.log(`Query: "${q}" -> Non trovato`);
    }
  }
}

testNominatim();
