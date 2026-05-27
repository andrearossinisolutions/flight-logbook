import { resolveQueryToIcaos, getBriefingRoute } from "../lib/weather";

async function runTest() {
  console.log("=== INIZIO TEST METEO ===");

  const testCases = [
    { query: "Dovera - Valle Gaffaro", base: "LIML" },
    { query: "Il Gabbiano - Cecina", base: "LIML" },
    { query: "Valle Gaffaro", base: "LIML" },
    { query: "Cecina (aviosuperficie)", base: "LIML" },
    { query: "LIML, LIME, LIPZ", base: "LIML" },
    { query: "Torino", base: "LIML" },
  ];

  for (const tc of testCases) {
    console.log(`\nQuery: "${tc.query}" (Base: ${tc.base})`);
    try {
      const route = await resolveQueryToIcaos(tc.query, tc.base);
      console.log("Risultato resolveQueryToIcaos:", route);
      
      const routeBriefing = await getBriefingRoute(tc.query, tc.base);
      console.log("Risultato getBriefingRoute:", routeBriefing);
    } catch (err) {
      console.error("Errore durante il test:", err);
    }
  }

  console.log("\n=== FINE TEST METEO ===");
}

runTest();
