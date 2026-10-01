"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { MapPoint, MapRoute } from "./flight-map-inner";

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

const POLL_INTERVAL_MS = 60_000;

interface PublicFlightMapProps {
  token: string;
  points: MapPoint[];
  routes: MapRoute[];
}

export default function PublicFlightMap({ token, points: initialPoints, routes: initialRoutes }: PublicFlightMapProps) {
  const [points, setPoints] = useState(initialPoints);
  const [routes, setRoutes] = useState(initialRoutes);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    async function refresh() {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      try {
        const res = await fetch(`/api/public-map/${token}`, { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setPoints(data.points);
          setRoutes(data.routes);
        }
      } catch {
        // Ignora errori di rete transitori: riprova al prossimo giro di polling
      } finally {
        isFetchingRef.current = false;
      }
    }

    const intervalId = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [token]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <FlightMapInner points={points} routes={routes} interactive={false} showLabels showSummary={false} />
    </div>
  );
}
