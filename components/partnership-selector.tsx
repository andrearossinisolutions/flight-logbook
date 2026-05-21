"use client";

import { useRouter } from "next/navigation";
import type { Route } from "next";

type PartnershipSelectorProps = {
  partnerships: Array<{ id: string; name: string }>;
  currentId: string;
};

export function PartnershipSelector({ partnerships, currentId }: PartnershipSelectorProps) {
  const router = useRouter();

  if (partnerships.length <= 1) {
    return null;
  }

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <label htmlFor="partnership-select" className="muted" style={{ fontSize: "0.85rem", fontWeight: 600, whiteSpace: "nowrap" }}>
        Società attiva:
      </label>
      <select
        id="partnership-select"
        className="select"
        value={currentId}
        onChange={(e) => {
          const val = e.target.value;
          if (val === "__manage__") {
            router.push("/societa?manage=true" as Route);
          } else {
            router.push(`/societa/${val}` as Route);
          }
        }}
        style={{
          width: "auto",
          minWidth: "200px",
          padding: "6px 32px 6px 12px",
          borderRadius: "10px",
          fontSize: "0.9rem",
          cursor: "pointer",
        }}
      >
        {partnerships.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
        <option value="__manage__">+ Gestisci / Crea Nuova</option>
      </select>
    </div>
  );
}
