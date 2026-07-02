"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
        background: "var(--card, #ffffff)",
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

export type { MapPoint, MapRoute };

interface FlightMapProps {
  points: MapPoint[];
  routes: MapRoute[];
  hasBase?: boolean;
}

export default function FlightMap({ points, routes, hasBase }: FlightMapProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingPlaceName, setEditingPlaceName] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const editingPlace = points.find((p) => p.name === editingPlaceName) || null;

  function handleEditPlace(name: string) {
    const place = points.find((p) => p.name === name);
    if (place) {
      setEditingPlaceName(name);
      setAddressInput(place.address || "");
      setErrorMessage(null);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPlace) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/custom-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPlace.name,
          address: addressInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossibile salvare la posizione");
      }

      // Successo! Ricarica i dati del server e chiudi il modal
      startTransition(() => {
        router.refresh();
        setEditingPlaceName(null);
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Si è verificato un errore");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleReset() {
    if (!editingPlace) return;
    if (!window.confirm("Vuoi davvero ripristinare la posizione automatica per questa località?")) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/custom-locations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPlace.name,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossibile ripristinare la posizione");
      }

      // Successo! Ricarica i dati del server e chiudi il modal
      startTransition(() => {
        router.refresh();
        setEditingPlaceName(null);
      });
    } catch (err: any) {
      setErrorMessage(err.message || "Si è verificato un errore");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      <FlightMapInner points={points} routes={routes} onEditPlace={handleEditPlace} />

      {!hasBase && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            zIndex: 1000,
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 20px",
              borderRadius: 16,
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 10px 30px rgba(20, 32, 51, 0.15)",
              border: "1px solid rgba(255, 255, 255, 0.5)",
              animation: "fadeInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
              maxWidth: "90%",
              width: "max-content",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: "1.25rem" }}>🏠</span>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text, #142033)" }}>
                  Nessuna base operativa impostata
                </span>
                <span style={{ fontSize: "0.75rem", color: "var(--muted, #60708a)" }}>
                  Imposta la tua base per visualizzarla sulla mappa e attivare statistiche specifiche.
                </span>
              </div>
            </div>
            <Link
              href="/settings"
              className="btn"
              style={{
                padding: "8px 14px",
                fontSize: "0.82rem",
                height: "auto",
                whiteSpace: "nowrap",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 8,
                background: "var(--primary, #1f6f5b)",
                color: "white",
                fontWeight: 600,
              }}
            >
              Imposta Base
            </Link>
          </div>
        </div>
      )}

      {/* Modal di modifica posizione */}
      {editingPlace && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            background: "rgba(20, 32, 51, 0.45)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: 450,
              padding: "28px 24px",
              boxShadow: "0 20px 50px rgba(20, 32, 51, 0.15)",
              animation: "fadeIn 0.2s ease",
            }}
          >
            <h3 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.25rem" }}>
              📍 Personalizza Posizione
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--muted)", margin: "0 0 16px 0", lineHeight: "1.4" }}>
              Modifica la posizione geografica per la destinazione: <strong>{editingPlace.name}</strong>. Verrà applicata a tutti i voli passati e futuri.
            </p>

            <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div className="field">
                <label htmlFor="addressInput" style={{ fontWeight: 700, marginBottom: 6, display: "block" }}>
                  Indirizzo o Coordinate GPS
                </label>
                <input
                  id="addressInput"
                  type="text"
                  className="input"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Es. 'Isolone, Piacenza, Italia' o '45.031, 9.684'"
                  required
                  disabled={isSaving}
                  autoFocus
                />
                <span className="muted" style={{ fontSize: "0.75rem", marginTop: 4, display: "block" }}>
                  Puoi inserire un indirizzo testuale, il nome di una città/aviosuperficie oppure coordinate espresse in gradi decimali separati da virgola.
                </span>
              </div>

              {errorMessage && (
                <div
                  style={{
                    color: "var(--danger, #b42318)",
                    fontSize: "0.85rem",
                    background: "rgba(180, 35, 24, 0.05)",
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(180, 35, 24, 0.15)",
                  }}
                >
                  ⚠️ {errorMessage}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 8,
                  flexWrap: "wrap",
                }}
              >
                {editingPlace.hasOverride && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="btn secondary"
                    style={{
                      marginRight: "auto",
                      borderColor: "var(--danger, #b42318)",
                      color: "var(--danger, #b42318)",
                      padding: "8px 14px",
                      height: "auto",
                      fontSize: "0.88rem",
                    }}
                    disabled={isSaving}
                  >
                    Ripristina Originale
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setEditingPlaceName(null)}
                  className="btn secondary"
                  style={{ padding: "8px 14px", height: "auto", fontSize: "0.88rem" }}
                  disabled={isSaving}
                >
                  Annulla
                </button>

                <button
                  type="submit"
                  className="btn"
                  style={{ padding: "8px 18px", height: "auto", fontSize: "0.88rem" }}
                  disabled={isSaving || isPending}
                >
                  {isSaving || isPending ? "Salvataggio..." : "Cerca e Salva"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
