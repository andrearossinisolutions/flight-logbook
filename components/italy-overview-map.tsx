"use client";

import dynamic from "next/dynamic";

const FlightMapInner = dynamic(() => import("./flight-map-inner"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0b1320",
      }}
    >
      <p style={{ margin: 0, fontSize: "1rem", color: "#9fb3cc" }}>Caricamento mappa in corso...</p>
    </div>
  ),
});

export default function ItalyOverviewMap() {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <FlightMapInner points={[]} routes={[]} interactive={false} showSummary={false} />
    </div>
  );
}
