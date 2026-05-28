"use client";

import dynamic from "next/dynamic";

const PlannerMap = dynamic(() => import("@/components/planner-map"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: "100%",
      height: "100%",
      minHeight: "500px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f8fafc",
      borderRadius: "16px",
      border: "1px solid var(--border)"
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        border: "4px solid var(--border)",
        borderTop: "4px solid var(--primary)",
        borderRadius: "50%",
        animation: "spin 1s linear infinite"
      }} />
      <p style={{ marginTop: 12, fontWeight: 600 }}>Caricamento Mappa Aeronautica...</p>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
});

interface PlannerMapWrapperProps {
  centerLat: number;
  centerLon: number;
  defaultBase: string;
}

export default function PlannerMapWrapper({ centerLat, centerLon, defaultBase }: PlannerMapWrapperProps) {
  return (
    <PlannerMap 
      centerLat={centerLat} 
      centerLon={centerLon} 
      defaultBase={defaultBase} 
    />
  );
}
