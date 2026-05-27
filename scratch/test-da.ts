import { getLocationWeatherDetails } from "../lib/weather";

async function testDA() {
  console.log("=== CALCOLO DENSITY ALTITUDE LOCALITÀ ESATTE ===");
  
  // Dovera (near LIML, QNH standard 1013.25 for test, or custom)
  const dovera = await getLocationWeatherDetails("Dovera", 1013.25);
  console.log("\nDecollo Dovera:", dovera);

  // Valle Gaffaro (near LIPZ, QNH standard 1013.25)
  const gaffaro = await getLocationWeatherDetails("Valle Gaffaro", 1013.25);
  console.log("\nAtterraggio Valle Gaffaro:", gaffaro);
}

testDA();
