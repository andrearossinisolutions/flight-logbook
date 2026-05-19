"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Route } from "next";

export function DashboardRegistryActions() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="row dashboard-actions-row" style={{ position: "relative" }}>
      {/* Dropdown Container */}
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
