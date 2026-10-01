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
  knownPassengers?: string[];
}

export default function FlightMap({ points, routes, hasBase, knownPassengers = [] }: FlightMapProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingPlaceName, setEditingPlaceName] = useState<string | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Condivisione mappa pubblica (senza sessione)
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [includeFuturePlans, setIncludeFuturePlans] = useState(false);
  const [passengerFilters, setPassengerFilters] = useState<string[]>([]);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isLoadingExistingLink, setIsLoadingExistingLink] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isEditingOptions, setIsEditingOptions] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleOpenShareMenu() {
    const willOpen = !isShareMenuOpen;
    setIsShareMenuOpen(willOpen);
    if (!willOpen) return;

    setIsLoadingExistingLink(true);
    setShareError(null);
    try {
      const res = await fetch("/api/map-share");
      const data = await res.json();

      if (res.ok && data.link) {
        setIncludeFuturePlans(data.link.includeFuturePlans);
        setPassengerFilters(data.link.passengers || []);
        setGeneratedLink(`${window.location.origin}/public-map/${data.link.token}`);
        setIsEditingOptions(false);
      } else {
        setGeneratedLink(null);
        setIsEditingOptions(true);
      }
    } catch (err: any) {
      setShareError(err.message || "Si è verificato un errore");
      setIsEditingOptions(true);
    } finally {
      setIsLoadingExistingLink(false);
    }
  }

  async function handleGenerateLink() {
    setIsGeneratingLink(true);
    setShareError(null);

    try {
      const res = await fetch("/api/map-share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          includeFuturePlans,
          passengers: passengerFilters.filter((p) => p.trim() !== ""),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Impossibile generare il link");
      }

      const url = `${window.location.origin}/public-map/${data.token}`;
      setGeneratedLink(url);
      setIsEditingOptions(false);
      setCopied(false);
    } catch (err: any) {
      setShareError(err.message || "Si è verificato un errore");
    } finally {
      setIsGeneratingLink(false);
    }
  }

  async function handleCopyLink() {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  function closeShareMenu() {
    setIsShareMenuOpen(false);
    setShareError(null);
  }

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

      {/* Bottone per condividere la mappa senza necessità di login (es. per un televisore) */}
      <div style={{ position: "absolute", top: 96, right: 12, zIndex: 1001 }}>
        <button
          type="button"
          className="btn secondary"
          onClick={handleOpenShareMenu}
          style={{
            padding: "8px 14px",
            height: "auto",
            fontSize: "0.85rem",
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          🔗 Condividi mappa
        </button>

        {isShareMenuOpen && (
          <div
            className="card"
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 320,
              maxWidth: "90vw",
              padding: "18px 16px",
              boxShadow: "0 10px 30px rgba(20, 32, 51, 0.18)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1rem" }}>🔗 Link pubblico mappa</h3>
              <button
                type="button"
                onClick={closeShareMenu}
                aria-label="Chiudi"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--muted)" }}
              >
                ✕
              </button>
            </div>
            {isLoadingExistingLink ? (
              <span className="muted" style={{ fontSize: "0.85rem" }}>Caricamento...</span>
            ) : (
              <>
                {generatedLink && !isEditingOptions ? (
                  <>
                    <p className="muted" style={{ margin: 0, fontSize: "0.8rem", lineHeight: 1.4 }}>
                      Il tuo link pubblico è già pronto. Le mete non sono cliccabili e non serve accedere per vederlo (es. su un televisore).
                    </p>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input
                        className="input"
                        type="text"
                        readOnly
                        value={generatedLink}
                        onFocus={(e) => e.target.select()}
                        style={{ flex: 1, fontSize: "0.8rem" }}
                      />
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        aria-label="Copia link"
                        title="Copia link"
                        style={{
                          flexShrink: 0,
                          width: 34,
                          height: 34,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 8,
                          border: "1px solid var(--border)",
                          background: copied ? "var(--primary, #1f6f5b)" : "var(--card, #fff)",
                          color: copied ? "white" : "var(--text)",
                          cursor: "pointer",
                        }}
                      >
                        {copied ? "✓" : "📋"}
                      </button>
                    </div>
                    <button
                      type="button"
                      className="btn secondary"
                      onClick={() => setIsEditingOptions(true)}
                      style={{ alignSelf: "flex-start", padding: "6px 10px", height: "auto", fontSize: "0.8rem" }}
                    >
                      ⚙️ Modifica opzioni
                    </button>
                  </>
                ) : (
                  <>
                    <p className="muted" style={{ margin: 0, fontSize: "0.8rem", lineHeight: 1.4 }}>
                      Genera un link visualizzabile senza bisogno di accedere (es. da mostrare su un televisore). Le mete non saranno cliccabili.
                    </p>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.88rem", cursor: "pointer" }}>
                      <input
                        type="checkbox"
                        checked={includeFuturePlans}
                        onChange={(e) => setIncludeFuturePlans(e.target.checked)}
                      />
                      Includi pianificazioni future
                    </label>

                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: "0.85rem" }}>Filtra per passeggero</span>
                      {passengerFilters.length === 0 ? (
                        <span className="muted" style={{ fontSize: "0.8rem" }}>
                          Nessun filtro: verranno mostrati tutti i tuoi voli.
                        </span>
                      ) : null}
                      {passengerFilters.map((name, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            className="input"
                            type="text"
                            list="knownPassengersList"
                            value={name}
                            onChange={(e) => {
                              const next = [...passengerFilters];
                              next[idx] = e.target.value;
                              setPassengerFilters(next);
                            }}
                            placeholder="Es. Veronica"
                            style={{ flex: 1, fontSize: "0.85rem" }}
                          />
                          <button
                            type="button"
                            className="btn secondary"
                            onClick={() => setPassengerFilters(passengerFilters.filter((_, i) => i !== idx))}
                            style={{ padding: "6px 10px", height: "auto", fontSize: "0.8rem", color: "var(--danger)", borderColor: "var(--danger)" }}
                          >
                            Rimuovi
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn secondary"
                        onClick={() => setPassengerFilters([...passengerFilters, ""])}
                        style={{ alignSelf: "flex-start", padding: "6px 10px", height: "auto", fontSize: "0.8rem" }}
                      >
                        ➕ Aggiungi passeggero
                      </button>
                      <datalist id="knownPassengersList">
                        {knownPassengers.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                      {generatedLink && (
                        <button
                          type="button"
                          className="btn secondary"
                          onClick={() => setIsEditingOptions(false)}
                          style={{ padding: "8px 14px", height: "auto", fontSize: "0.85rem" }}
                        >
                          Annulla
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn"
                        onClick={handleGenerateLink}
                        disabled={isGeneratingLink}
                        style={{ padding: "8px 14px", height: "auto", fontSize: "0.88rem", flex: 1 }}
                      >
                        {isGeneratingLink ? "Generazione..." : generatedLink ? "Aggiorna link" : "Genera link"}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {shareError && (
              <div
                style={{
                  color: "var(--danger, #b42318)",
                  fontSize: "0.82rem",
                  background: "rgba(180, 35, 24, 0.05)",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "1px solid rgba(180, 35, 24, 0.15)",
                }}
              >
                ⚠️ {shareError}
              </div>
            )}
          </div>
        )}
      </div>

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
