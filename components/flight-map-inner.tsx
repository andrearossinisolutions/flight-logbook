"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapPoint {
  name: string;
  lat: number;
  lon: number;
  isBase: boolean;
  flightCount: number;
  address: string | null;
  hasOverride: boolean;
  lastVisit: string | null;
}

export interface MapRoute {
  from: string;
  to: string;
  fromCoords: { lat: number; lon: number };
  toCoords: { lat: number; lon: number };
  count: number;
}

interface FlightMapProps {
  points: MapPoint[];
  routes: MapRoute[];
  onEditPlace: (name: string) => void;
}

export default function FlightMapInner({ points, routes, onEditPlace }: FlightMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const onEditPlaceRef = useRef(onEditPlace);

  // Aggiorna il ref per evitare chiusure stantie
  useEffect(() => {
    onEditPlaceRef.current = onEditPlace;
  }, [onEditPlace]);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Inizializza la mappa solo una volta
    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: true,
      });

      // Aggiungi i tile di OpenStreetMap
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      // Gestione click sui pulsanti "Modifica posizione" dentro i popup Leaflet
      mapRef.current.on("popupopen", (e) => {
        const container = e.popup.getElement();
        if (!container) return;
        const btn = container.querySelector(".edit-location-btn");
        if (btn) {
          btn.addEventListener("click", () => {
            const placeName = btn.getAttribute("data-place-name");
            if (placeName) {
              onEditPlaceRef.current(placeName);
            }
          });
        }
      });
    }

    const map = mapRef.current;

    // Rimuovi marker e rotte esistenti prima di ri-disegnare
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const latLngs: L.LatLngTuple[] = [];

    // Crea icone personalizzate per evitare problemi di caricamento delle immagini in Next.js
    const homeIcon = L.divIcon({
      html: `
        <div style="
          background-color: var(--primary, #1f6f5b);
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(20, 32, 51, 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          cursor: pointer;
          transition: transform 0.2s ease;
        "
        onmouseover="this.style.transform='scale(1.15)'"
        onmouseout="this.style.transform='scale(1)'"
        >
          🏠
        </div>
      `,
      className: "custom-home-marker",
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
    });

    const pinIcon = L.divIcon({
      html: `
        <div style="
          background-color: #e05e5e;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 2px solid white;
          box-shadow: 0 3px 8px rgba(20, 32, 51, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: transform 0.2s ease;
        "
        onmouseover="this.style.transform='scale(1.15)'"
        onmouseout="this.style.transform='scale(1)'"
        >
          📍
        </div>
      `,
      className: "custom-pin-marker",
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });

    // Aggiungi i marker
    points.forEach((p) => {
      if (typeof p.lat !== "number" || typeof p.lon !== "number" || isNaN(p.lat) || isNaN(p.lon)) {
        return;
      }

      const position: L.LatLngTuple = [p.lat, p.lon];
      latLngs.push(position);

      const marker = L.marker(position, {
        icon: p.isBase ? homeIcon : pinIcon,
        title: p.name,
      }).addTo(map);

      // Definisci il contenuto del popup
      const popupContent = p.isBase
        ? `
          <div style="font-family: sans-serif; padding: 4px; color: var(--text, #142033); min-width: 180px;">
            <h4 style="margin: 0 0 8px 0; font-size: 1rem; color: var(--primary, #1f6f5b); border-bottom: 1px solid var(--border, #d9e0ea); padding-bottom: 4px;">
              🏠 Base Operativa
            </h4>
            <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 8px;">${p.name}</div>
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 8px;">
              <span style="color: var(--muted, #60708a);">Numero voli:</span>
              <strong>${p.flightCount}</strong>
            </div>
            <button class="edit-location-btn" data-place-name="${p.name}" style="background: none; border: none; color: var(--primary, #1f6f5b); text-decoration: underline; font-size: 0.82rem; padding: 0; margin-top: 8px; cursor: pointer; display: block; text-align: left; font-family: inherit;">
              ✏️ Modifica posizione
            </button>
          </div>
        `
        : `
          <div style="font-family: sans-serif; padding: 4px; color: var(--text, #142033); min-width: 180px;">
            <h4 style="margin: 0 0 8px 0; font-size: 1rem; color: #b42318; border-bottom: 1px solid var(--border, #d9e0ea); padding-bottom: 4px;">
              📍 Destinazione Visitata
            </h4>
            <div style="font-weight: 700; font-size: 1.1rem; margin-bottom: 8px;">${p.name}</div>
            <div style="display: flex; justify-content: space-between; font-size: 0.88rem; margin-bottom: 8px;">
              <span style="color: var(--muted, #60708a);">Numero voli:</span>
              <strong>${p.flightCount}</strong>
            </div>
            ${
              p.lastVisit
                ? `
              <div style="font-size: 0.8rem; color: var(--muted, #60708a); border-top: 1px dashed var(--border, #d9e0ea); padding-top: 6px; margin-top: 4px; margin-bottom: 8px;">
                Ultima visita: ${p.lastVisit}
              </div>
            `
                : ""
            }
            <button class="edit-location-btn" data-place-name="${p.name}" style="background: none; border: none; color: var(--primary, #1f6f5b); text-decoration: underline; font-size: 0.82rem; padding: 0; margin-top: 8px; cursor: pointer; display: block; text-align: left; font-family: inherit;">
              ✏️ Modifica posizione
            </button>
          </div>
        `;

      marker.bindPopup(popupContent);
    });

    // Aggiungi le rotte (linee di collegamento)
    routes.forEach((r) => {
      if (
        typeof r.fromCoords.lat !== "number" ||
        typeof r.fromCoords.lon !== "number" ||
        typeof r.toCoords.lat !== "number" ||
        typeof r.toCoords.lon !== "number"
      ) {
        return;
      }

      const path: L.LatLngTuple[] = [
        [r.fromCoords.lat, r.fromCoords.lon],
        [r.toCoords.lat, r.toCoords.lon],
      ];

      // Lo spessore varia in base al numero di voli effettuati su quella rotta (spessore base aumentato a 4.0)
      const weight = 4.0 + Math.min(6.0, r.count * 0.75);

      const polyline = L.polyline(path, {
        color: "#e6007e",
        weight: weight,
        opacity: 1.0,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      // Aggiungi un tooltip che segue il mouse lungo la rotta
      polyline.bindTooltip(
        `
        <div style="font-family: sans-serif; font-size: 0.85rem; padding: 2px; color: #142033;">
          Rotta: <strong>${r.from}</strong> ⇄ <strong>${r.to}</strong><br/>
          Voli effettuati: <strong>${r.count}</strong>
        </div>
      `,
        {
          sticky: true,
          opacity: 0.95,
        }
      );
    });

    // Centra e adatta la mappa
    if (latLngs.length > 0) {
      if (latLngs.length === 1) {
        // Se c'è solo un punto (es. solo la casa o una sola destinazione)
        map.setView(latLngs[0], 12);
      } else {
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
        });
      }
    } else {
      // Centro sull'Italia se non ci sono punti
      map.setView([42.0, 12.5], 6);
    }
  }, [points, routes]);

  return (
    <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Stile CSS per spostare i controlli di zoom di Leaflet al di sotto della navbar flottante */}
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-top {
          top: 92px !important;
        }
      `}} />

      {/* Informazioni sovrapposte alla mappa in alto a destra */}
      <div
        style={{
          position: "absolute",
          top: 96,
          right: 12,
          zIndex: 1000,
          background: "rgba(255, 255, 255, 0.9)",
          backdropFilter: "blur(10px)",
          border: "1px solid var(--border)",
          padding: "10px 16px",
          borderRadius: 12,
          boxShadow: "0 4px 15px rgba(0,0,0,0.06)",
          maxWidth: 240,
        }}
      >
        <h3 style={{ margin: "0 0 6px 0", fontSize: "0.95rem", color: "var(--text)" }}>Riepilogo</h3>
        <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", color: "var(--muted)" }}>
          Destinazioni: <strong>{points.filter(p => !p.isBase).length}</strong>
        </p>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--muted)" }}>
          Base: <strong>{points.find(p => p.isBase)?.name || "Non impostata"}</strong>
        </p>
      </div>

      <div
        ref={mapContainerRef}
        style={{
          flex: 1,
          width: "100%",
          height: "100%",
          overflow: "hidden",
        }}
      />
    </div>
  );
}
