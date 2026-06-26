import { fetchSwllCharts } from "../lib/weather";

async function verify() {
  console.log("Testing fetchSwllCharts() from lib/weather...");
  try {
    const charts = await fetchSwllCharts();
    console.log(`Successfully fetched ${charts.length} charts.`);
    charts.forEach((chart, idx) => {
      console.log(`[Chart #${idx + 1}]`);
      console.log(`  Label: ${chart.label}`);
      console.log(`  Date:  ${chart.date.toISOString()}`);
      console.log(`  URL:   ${chart.url}`);
    });
  } catch (err) {
    console.error("Verification failed with error:", err);
  }
}

verify();
