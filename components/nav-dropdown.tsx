"use client";

import Link from "next/link";
import type { Route } from "next";
import { usePathname } from "next/navigation";
import type { ComponentType, FocusEvent } from "react";
import { useEffect, useId, useRef, useState } from "react";

export type NavDropdownItem = {
  key: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  active: boolean;
  href?: string;
  onSelect?: () => void;
};

// Menu a tendina per la navigazione su mobile: il trigger mostra la voce corrente,
// il pannello elenca le altre voci. Visibile solo sotto i 768px (vedi globals.css).
export function NavDropdown({ items, ariaLabel = "Navigazione", align = "start" }: { items: NavDropdownItem[]; ariaLabel?: string; align?: "start" | "end" }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const pathname = usePathname();

  const current = items.find((item) => item.active);
  const others = items.filter((item) => item !== current);

  // Chiude al cambio di pagina
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;

    // Fase di capture: la mappa Leaflet potrebbe consumare l'evento prima che arrivi al document
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Dopo la selezione o l'uscita con Tab il focus torna al trigger / il pannello si chiude
  function selectAndClose() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleBlur(e: FocusEvent<HTMLDivElement>) {
    const next = e.relatedTarget as Node | null;
    if (next && !e.currentTarget.contains(next)) setOpen(false);
  }

  if (items.length === 0) return null;
  const CurrentIcon = current?.icon;
  const currentLabel = current?.label ?? "Menu";

  return (
    <div className={`nav-dropdown ${align === "end" ? "nav-dropdown-align-end" : ""}`} ref={rootRef} onBlur={handleBlur}>
      <button
        ref={triggerRef}
        type="button"
        className="nav-dropdown-trigger"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={`${ariaLabel}: ${currentLabel}`}
        onClick={() => setOpen((prev) => !prev)}
      >
        {CurrentIcon && <CurrentIcon size={18} />}
        <span className="nav-dropdown-label">{currentLabel}</span>
        <svg
          className={`nav-dropdown-chevron ${open ? "open" : ""}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <ul className="nav-dropdown-panel" id={panelId}>
          {others.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <Icon size={18} />
                <span className="nav-dropdown-label">{item.label}</span>
              </>
            );
            return (
              <li key={item.key}>
                {item.href ? (
                  <Link
                    href={item.href as Route}
                    className="nav-dropdown-item"
                    onClick={selectAndClose}
                  >
                    {content}
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="nav-dropdown-item"
                    onClick={() => {
                      selectAndClose();
                      item.onSelect?.();
                    }}
                  >
                    {content}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
