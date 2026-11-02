"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";

const FILTERS: { href: string; value: string; icon: string; label: string }[] = [
  { href: "/logbook", value: "", icon: "📋", label: "Tutti i movimenti" },
  { href: "/logbook?filter=pianificazioni", value: "pianificazioni", icon: "📅", label: "Pianificazioni" },
  { href: "/logbook?filter=voli-passati", value: "voli-passati", icon: "✈️", label: "Voli passati" },
  { href: "/logbook?filter=pagamenti", value: "pagamenti", icon: "💶", label: "Pagamenti" },
  { href: "/logbook?filter=promemoria-futuri", value: "promemoria-futuri", icon: "🔔", label: "Promemoria futuri" },
];

function CardContent({ icon, full, short }: { icon: string; full: string; short: string }) {
  return (
    <>
      <span className="quick-action-icon" aria-hidden="true">{icon}</span>
      <span className="quick-action-label quick-action-label-short" aria-hidden="true">{short}</span>
      <span className="quick-action-label quick-action-label-full" aria-hidden="true">{full}</span>
    </>
  );
}

export function DashboardQuickActions({ hasPartnership }: { hasPartnership: boolean }) {
  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter") || "";
  const [filterOpen, setFilterOpen] = useState(false)
  const panelOpen = filterOpen || activeFilter !== "";

  return (
    <div className="quick-actions-wrap">
      <div className="quick-actions">
        <Link href="/new-flight" className="quick-action-card quick-action-flight" title="Aggiungi volo passato" aria-label="Aggiungi volo passato">
          <CardContent icon="✈️" full="Aggiungi volo passato" short="Volo passato" />
        </Link>
        {hasPartnership && (
          <button
            type="button"
            className="quick-action-card quick-action-flight"
            title="Registra rifornimento Società"
            aria-label="Registra rifornimento Società"
            onClick={() => {
              // TODO: azione da definire
            }}
          >
            <CardContent icon="⛽" full="Registra rifornimento Società" short="Rifornimento" />
          </button>
        )}
        <Link
          href={"/new-flight?prefillIsDraft=true" as Route}
          className="quick-action-card quick-action-flight"
          title="Pianifica volo"
          aria-label="Pianifica volo"
        >
          <CardContent icon="📅" full="Pianifica volo" short="Pianifica" />
        </Link>
        <span className="quick-actions-break" aria-hidden="true" />
        <Link href="/new-payment" className="quick-action-card" title="Registra pagamento AeroClub" aria-label="Registra pagamento AeroClub">
          <CardContent icon="💶" full="Registra pagamento AeroClub" short="Pagamento" />
        </Link>
        <Link href="/new-reminder" className="quick-action-card" title="Aggiungi promemoria" aria-label="Aggiungi promemoria">
          <CardContent icon="🔔" full="Aggiungi promemoria" short="Promemoria" />
        </Link>
        <button
          type="button"
          className={`quick-action-card ${activeFilter ? "active" : ""}`}
          aria-expanded={panelOpen}
          aria-controls="quick-filter-panel"
          title="Filtra movimenti"
          aria-label="Filtra movimenti"
          onClick={() => setFilterOpen((v) => !v)}
        >
          <CardContent icon="🔍" full="Filtra movimenti" short="Filtra" />
        </button>
        <Link href={"/print-logbook" as Route} className="quick-action-card" title="Stampa logbook" aria-label="Stampa logbook">
          <CardContent icon="🖨️" full="Stampa logbook" short="Stampa" />
        </Link>
      </div>

      {panelOpen && (
        <div className="quick-filter-panel" id="quick-filter-panel">
          {FILTERS.map((f) => (
            <Link
              key={f.value || "all"}
              href={f.href as Route}
              className={activeFilter === f.value ? "active" : ""}
              aria-current={activeFilter === f.value ? "page" : undefined}
              onClick={() => setFilterOpen(false)}
            >
              <span aria-hidden="true">{f.icon}</span>
              <span>{f.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
