async function testOpenMeteo() {
  const lat = 45.36568;
  const lon = 9.53822; // Dovera coordinates
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`;

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
    const data = await res.json();
    console.log("Open-Meteo Response for Dovera:");
    console.log("Elevation (m):", data.elevation);
    console.log("Current Temp (°C):", data.current?.temperature_2m);
    console.log("Full data:", JSON.stringify(data));
  } catch (err) {
    console.error("Error fetching Open-Meteo:", err);
  }
}

testOpenMeteo();
