"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { Route } from "next";

export function DashboardRegistryActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  const searchParams = useSearchParams();
  const activeFilter = searchParams.get("filter") || "";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="row dashboard-actions-row" style={{ position: "relative", gap: 12 }}>
      {/* Add Dropdown Container */}
      <div ref={dropdownRef} className="dropdown-container">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="btn icon-btn add-btn"
          aria-expanded={isOpen}
          aria-haspopup="true"
          title="Aggiungi movimento"
          style={{ fontSize: "22px", fontWeight: "bold", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          ⊕
        </button>

        {isOpen && (
          <div className="dropdown-menu">
            <Link
              href="/new-flight"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <span className="dropdown-item-icon">✈️</span>
              <span className="dropdown-item-text">Aggiungi volo</span>
            </Link>
            <Link
              href="/new-payment"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <span className="dropdown-item-icon">💶</span>
              <span className="dropdown-item-text">Aggiungi pagamento</span>
            </Link>
            <Link
              href="/new-reminder"
              className="dropdown-item"
              onClick={() => setIsOpen(false)}
            >
              <span className="dropdown-item-icon">🔔</span>
              <span className="dropdown-item-text">Aggiungi promemoria</span>
            </Link>
          </div>
        )}
      </div>

      {/* Filter Dropdown Container */}
      <div ref={filterDropdownRef} className="dropdown-container">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`btn icon-btn filter-btn ${activeFilter ? "active-filter" : "secondary"}`}
          aria-expanded={isFilterOpen}
          aria-haspopup="true"
          title="Filtra movimenti"
          style={{ fontSize: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
        >
          🔍
        </button>

        {isFilterOpen && (
          <div className="dropdown-menu">
            <Link
              href="/logbook"
              className={`dropdown-item ${activeFilter === "" ? "active" : ""}`}
              onClick={() => setIsFilterOpen(false)}
            >
              <span className="dropdown-item-icon">📋</span>
              <span className="dropdown-item-text">Tutti i movimenti</span>
            </Link>
            <Link
              href="/logbook?filter=pianificazioni"
              className={`dropdown-item ${activeFilter === "pianificazioni" ? "active" : ""}`}
              onClick={() => setIsFilterOpen(false)}
            >
              <span className="dropdown-item-icon">📅</span>
              <span className="dropdown-item-text">Pianificazioni</span>
            </Link>
            <Link
              href="/logbook?filter=voli-passati"
              className={`dropdown-item ${activeFilter === "voli-passati" ? "active" : ""}`}
              onClick={() => setIsFilterOpen(false)}
            >
              <span className="dropdown-item-icon">✈️</span>
              <span className="dropdown-item-text">Voli passati</span>
            </Link>
            <Link
              href="/logbook?filter=pagamenti"
              className={`dropdown-item ${activeFilter === "pagamenti" ? "active" : ""}`}
              onClick={() => setIsFilterOpen(false)}
            >
              <span className="dropdown-item-icon">💶</span>
              <span className="dropdown-item-text">Pagamenti</span>
            </Link>
            <Link
              href="/logbook?filter=promemoria-futuri"
              className={`dropdown-item ${activeFilter === "promemoria-futuri" ? "active" : ""}`}
              onClick={() => setIsFilterOpen(false)}
            >
              <span className="dropdown-item-icon">🔔</span>
              <span className="dropdown-item-text">Promemoria futuri</span>
            </Link>
          </div>
        )}
      </div>

      {/* Print Button */}
      <Link
        href={"/print-logbook" as Route}
        className="btn secondary icon-btn print-btn"
        title="Stampa logbook"
        style={{ fontSize: "18px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
      >
        🖨️
      </Link>
    </div>
  );
}
