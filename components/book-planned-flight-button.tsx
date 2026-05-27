"use client";

import { useFormStatus } from "react-dom";

export function BookPlannedFlightButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="btn"
      style={{
        padding: "6px 12px",
        fontSize: "0.8rem",
        lineHeight: 1,
        borderRadius: 8,
        backgroundColor: "#2563eb",
        borderColor: "#2563eb",
        color: "white",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: 38,
        cursor: pending ? "not-allowed" : "pointer",
        opacity: pending ? 0.75 : 1,
      }}
      title="Prenota l'aereo della società per questo volo"
      onClick={(e) => {
        const confirmed = window.confirm(
          "Vuoi prenotare l'aereo della società per questo volo pianificato?"
        );
        if (!confirmed) {
          e.preventDefault();
        }
      }}
    >
      📅 {pending ? "Prenotazione..." : "Prenota"}
    </button>
  );
}
