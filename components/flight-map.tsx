"use client";

import dynamic from "next/dynamic";
import type { MapPoint } from "./flight-map-inner";

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
        background: "var(--card, #ffffff)",
        borderRadius: 20,
        border: "1px solid var(--border, #d9e0ea)",
        minHeight: 400,
      }}
    >
      <div style={{ textAlign: "center", padding: 20 }}>
        <p className="muted" style={{ margin: 0, fontSize: "1rem" }}>
          Caricamento mappa in corso...
        </p>
      </div>
    </div>
  ),
});

export type { MapPoint };

interface FlightMapProps {
  points: MapPoint[];
}

export default function FlightMap({ points }: FlightMapProps) {
  return <FlightMapInner points={points} />;
}
