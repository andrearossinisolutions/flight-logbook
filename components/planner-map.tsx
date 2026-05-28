"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

interface PlannerMapProps {
  centerLat: number;
  centerLon: number;
  defaultBase: string;
}

interface Airspace {
  id: string;
  name: string;
  class: string;
  type: string;
  lowerLimit: string;
  upperLimit: string;
  coordinates: [number, number][];
}

interface ReportingPoint {
  id: string;
  name: string;
  code?: string;
  lat: number;
  lon: number;
  type: "VFR" | "IFR";
  description?: string;
}

interface Airport {
  id: string;
  name: string;
  icao: string;
  lat: number;
  lon: number;
  type: string;
  elevation: string;
}

export default function PlannerMap({ centerLat, centerLon, defaultBase }: PlannerMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const [airspaces, setAirspaces] = useState<Airspace[]>([]);
  const [reportingPoints, setReportingPoints] = useState<ReportingPoint[]>([]);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Toggles
  const [showVfr, setShowVfr] = useState(true);
  const [showIfr, setShowIfr] = useState(true);
  const [showAirspaces, setShowAirspaces] = useState(true);
  const [showAirports, setShowAirports] = useState(true);
  const [showOfm, setShowOfm] = useState(false);

  // Layer groups references for toggling
  const airspacesLayerGroup = useRef<L.LayerGroup | null>(null);
  const vfrLayerGroup = useRef<L.LayerGroup | null>(null);
  const ifrLayerGroup = useRef<L.LayerGroup | null>(null);
  const airportsLayerGroup = useRef<L.LayerGroup | null>(null);
  const ofmLayerRef = useRef<L.TileLayer | null>(null);

  // Helper to color airspaces by class/type aligning with ICAO standards
  function getAirspaceStyle(airspace: Airspace) {
    const type = airspace.type.toUpperCase();
    const airspaceClass = airspace.class.toUpperCase();

    if (type === "DANGER") {
      return { color: "#eab308", fillColor: "#eab308", fillOpacity: 0.12, weight: 2, dashArray: "4, 6" }; // Yellow dashed
    } else if (type === "PROHIBITED") {
      return { color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.15, weight: 2.5, dashArray: "4, 6" }; // Red dashed
    } else if (type === "RESTRICTED") {
      return { color: "#ea580c", fillColor: "#ea580c", fillOpacity: 0.12, weight: 2, dashArray: "4, 6" }; // Orange dashed
    }

    // Standard classes
    if (airspaceClass === "A") {
      return { color: "#7c3aed", fillColor: "#c084fc", fillOpacity: 0.12, weight: 2.5 }; // Purple (TMA)
    } else if (airspaceClass === "C") {
      return { color: "#db2777", fillColor: "#f472b6", fillOpacity: 0.12, weight: 2 }; // Magenta (CTA/TMA)
    } else if (airspaceClass === "D") {
      return { color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.1, weight: 2 }; // Blue (CTR)
    } else if (type === "ATZ" || type === "MATZ") {
      return { color: "#2563eb", fillColor: "#93c5fd", fillOpacity: 0.08, weight: 1.5, dashArray: "2, 4" }; // Blue dashed
    }

    return { color: "#4b5563", fillColor: "#9ca3af", fillOpacity: 0.06, weight: 1.5 }; // Grey
  }

  // Load Leaflet CSS on mount
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.crossOrigin = "";
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  // Initialize Map & set up bounding box fetching
  useEffect(() => {
    if (!mapRef.current) return;

    if (!leafletMap.current) {
      const map = L.map(mapRef.current, {
        center: [centerLat, centerLon],
        zoom: 10,
        minZoom: 6,
        maxZoom: 15
      });
      leafletMap.current = map;

      // Base layer: CartoDB Voyager
      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20
      }).addTo(map);

      // OpenFlightMaps layer (cycle 2605 - May 2026)
      const ofmUrl = "https://snapshots.openflightmaps.org/live/2605/tiles/world/noninteractive/epsg3857/merged/512/latest/{z}/{x}/{y}.png";
      const ofmLayer = L.tileLayer(ofmUrl, {
        maxZoom: 11,
        opacity: 0.55,
        attribution: 'Map &copy; <a href="https://www.openflightmaps.org/">openflightmaps</a>'
      });
      ofmLayerRef.current = ofmLayer;

      // Layer groups for vectors
      airspacesLayerGroup.current = L.layerGroup().addTo(map);
      vfrLayerGroup.current = L.layerGroup().addTo(map);
      ifrLayerGroup.current = L.layerGroup().addTo(map);
      airportsLayerGroup.current = L.layerGroup().addTo(map);

      // Special marker for Campo Base
      const baseIconHtml = `
        <div style="
          background-color: var(--primary);
          color: white;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.82rem;
        ">
          🛫
        </div>
      `;

      const homeIcon = L.divIcon({
        html: baseIconHtml,
        className: "custom-home-icon",
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      L.marker([centerLat, centerLon], { icon: homeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; padding: 4px;">
            <h4 style="margin: 0 0 6px 0; color: var(--primary-strong); font-weight:800;">Campo Base: ${defaultBase}</h4>
            <p style="margin: 0; font-size: 0.85rem;" class="muted">
              Coordinate: <b>${centerLat.toFixed(4)}, ${centerLon.toFixed(4)}</b>
            </p>
          </div>
        `);

      // Dynamic fetching function based on map bounds
      const fetchMapData = async () => {
        setLoading(true);
        const bounds = map.getBounds();
        const minLat = bounds.getSouth();
        const minLon = bounds.getWest();
        const maxLat = bounds.getNorth();
        const maxLon = bounds.getEast();
        // BBox format: minLon,minLat,maxLon,maxLat
        const bboxParam = `${minLon},${minLat},${maxLon},${maxLat}`;

        try {
          const [airspacesData, pointsData, airportsData] = await Promise.all([
            fetch(`/api/planner/airspaces?bbox=${encodeURIComponent(bboxParam)}`).then((r) => r.ok ? r.json() : []),
            fetch(`/api/planner/reporting-points?bbox=${encodeURIComponent(bboxParam)}`).then((r) => r.ok ? r.json() : []),
            fetch(`/api/planner/airports?bbox=${encodeURIComponent(bboxParam)}`).then((r) => r.ok ? r.json() : [])
          ]);
          setAirspaces(airspacesData);
          setReportingPoints(pointsData);
          setAirports(airportsData);
        } catch (err) {
          console.error("Error loading visible aeronautical data:", err);
        } finally {
          setLoading(false);
        }
      };

      // Query on mount and on every drag/zoom stop
      map.on("moveend", fetchMapData);
      fetchMapData();
    }
  }, [centerLat, centerLon, defaultBase]);

  // Reactive plotting of vectors based on state toggles
  useEffect(() => {
    const map = leafletMap.current;
    const airGroup = airspacesLayerGroup.current;
    const vfrGroup = vfrLayerGroup.current;
    const ifrGroup = ifrLayerGroup.current;
    const airportsGroup = airportsLayerGroup.current;

    if (!map || !airGroup || !vfrGroup || !ifrGroup || !airportsGroup) return;

    airGroup.clearLayers();
    vfrGroup.clearLayers();
    ifrGroup.clearLayers();
    airportsGroup.clearLayers();

    // 1. Plot Airspaces
    if (showAirspaces) {
      airspaces.forEach((airspace) => {
        if (!airspace.coordinates || airspace.coordinates.length === 0) return;

        const style = getAirspaceStyle(airspace);
        const polygon = L.polygon(airspace.coordinates, style);

        const typeLabel = airspace.type === "DANGER" ? "Zona Pericolosa" :
                          airspace.type === "PROHIBITED" ? "Zona Vietata" :
                          airspace.type === "RESTRICTED" ? "Zona Regolamentata" : airspace.type;

        polygon.bindPopup(`
          <div style="font-family: inherit; font-size: 0.9rem; padding: 4px;">
            <h4 style="margin: 0 0 8px 0; font-weight: 800; color: ${style.color};">${airspace.name}</h4>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div>Tipo: <b>${typeLabel} (${airspace.class})</b></div>
              <div>Limite inferiore: <b>${airspace.lowerLimit}</b></div>
              <div>Limite superiore: <b>${airspace.upperLimit}</b></div>
            </div>
          </div>
        `);

        polygon.addTo(airGroup);
      });
    }

    // 2. Plot Airports & Airfields (Aviosuperfici)
    if (showAirports) {
      // Certified Airport: Blue circle with airplane icon
      const airportSvg = `
        <svg width="22" height="22" viewBox="0 0 100 100" style="display: block;">
          <circle cx="50" cy="50" r="40" fill="#1e40af" stroke="white" stroke-width="8" />
          <path d="M50,15 L50,85 M20,50 L80,50 M50,45 L25,65 M50,45 L75,65 M50,80 L35,85 M50,80 L65,85" stroke="white" stroke-width="8" stroke-linecap="round" fill="none" />
        </svg>
      `;

      // Campi di Volo / Aviosuperfici: Green circle with airplane icon
      const airfieldSvg = `
        <svg width="18" height="18" viewBox="0 0 100 100" style="display: block;">
          <circle cx="50" cy="50" r="40" fill="#15803d" stroke="white" stroke-width="8" />
          <path d="M50,20 L50,80 M25,50 L75,50 M50,45 L30,65 M50,45 L70,65" stroke="white" stroke-width="8" stroke-linecap="round" fill="none" />
        </svg>
      `;

      airports.forEach((airport) => {
        const isCertified = ["CIVIL", "CIVIL_MILITARY", "MILITARY"].includes(airport.type);
        const iconSvg = isCertified ? airportSvg : airfieldSvg;

        const customIcon = L.divIcon({
          html: iconSvg,
          className: "custom-airport-icon",
          iconSize: isCertified ? [22, 22] : [18, 18],
          iconAnchor: isCertified ? [11, 11] : [9, 9]
        });

        const marker = L.marker([airport.lat, airport.lon], { icon: customIcon });

        // Show Tooltip with ICAO or Name
        marker.bindTooltip(airport.icao || airport.name, {
          permanent: false,
          direction: "top",
          offset: [0, -10]
        });

        // Popup with Airport details
        const typeLabel = isCertified ? "Aeroporto Certificato" : "Aviosuperficie / Campo Volo";
        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 0.88rem; padding: 4px; min-width: 160px;">
            <span style="color: ${isCertified ? "#1d4ed8" : "#15803d"}; font-weight: 700; text-transform: uppercase; font-size: 0.75rem;">
              ${typeLabel}
            </span>
            <h4 style="margin: 4px 0 6px 0; font-weight: 800; font-size: 0.95rem;">${airport.name} ${airport.icao ? `(${airport.icao})` : ""}</h4>
            <div style="display: flex; flex-direction: column; gap: 4px; margin-top: 6px;">
              <div>Elevazione: <b>${airport.elevation}</b></div>
              <div style="font-size: 0.8rem;" class="muted">Lat: ${airport.lat.toFixed(4)} · Lon: ${airport.lon.toFixed(4)}</div>
            </div>
          </div>
        `);

        marker.addTo(airportsGroup);
      });
    }

    // 3. Plot Waypoints & Reporting Points
    reportingPoints.forEach((point) => {
      if (point.type === "VFR") {
        if (!showVfr) return;

        // VFR Point: Official style circle with a center dot
        const circleSvg = `
          <svg width="16" height="16" viewBox="0 0 100 100" style="display: block;">
            <circle cx="50" cy="50" r="35" fill="none" stroke="#1d4ed8" stroke-width="14" />
            <circle cx="50" cy="50" r="10" fill="#1d4ed8" />
          </svg>
        `;

        const vfrIcon = L.divIcon({
          html: circleSvg,
          className: "custom-vfr-icon",
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        const marker = L.marker([point.lat, point.lon], { icon: vfrIcon });

        marker.bindTooltip(point.code || point.name, {
          permanent: true,
          direction: "top",
          offset: [0, -8],
          className: "leaflet-tooltip-vfr"
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 0.88rem; padding: 4px;">
            <span style="color: #2563eb; font-weight: 700; text-transform: uppercase;">Punto di Riporto VFR</span>
            <h4 style="margin: 4px 0 6px 0; font-weight: 800;">${point.name} ${point.code ? `(${point.code})` : ""}</h4>
            ${point.description ? `<p style="margin: 0; font-size: 0.8rem;" class="muted">${point.description}</p>` : ""}
            <p style="margin: 6px 0 0 0; font-size: 0.78rem;">Lat: ${point.lat.toFixed(4)} · Lon: ${point.lon.toFixed(4)}</p>
          </div>
        `);

        marker.addTo(vfrGroup);
      } else if (point.type === "IFR") {
        if (!showIfr) return;

        // IFR Point: Standard navigation triangle (Fix)
        const triangleSvg = `
          <svg width="14" height="14" viewBox="0 0 100 100" style="display: block;">
            <polygon points="50,15 90,85 10,85" fill="#10b981" stroke="#047857" stroke-width="12" />
          </svg>
        `;

        const ifrIcon = L.divIcon({
          html: triangleSvg,
          className: "custom-ifr-icon",
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });

        const marker = L.marker([point.lat, point.lon], { icon: ifrIcon });

        marker.bindTooltip(point.code || point.name, {
          permanent: true,
          direction: "top",
          offset: [0, -8],
          className: "leaflet-tooltip-ifr"
        });

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 0.88rem; padding: 4px;">
            <span style="color: #059669; font-weight: 700; text-transform: uppercase;">Punto IFR / Fix / Navaid</span>
            <h4 style="margin: 4px 0 6px 0; font-weight: 800;">${point.name} ${point.code ? `(${point.code})` : ""}</h4>
            ${point.description ? `<p style="margin: 0; font-size: 0.8rem;" class="muted">${point.description}</p>` : ""}
            <p style="margin: 6px 0 0 0; font-size: 0.78rem;">Lat: ${point.lat.toFixed(4)} · Lon: ${point.lon.toFixed(4)}</p>
          </div>
        `);

        marker.addTo(ifrGroup);
      }
    });

  }, [airspaces, reportingPoints, airports, showVfr, showIfr, showAirspaces, showAirports]);

  // Handle toggling OpenFlightMaps layer
  useEffect(() => {
    const map = leafletMap.current;
    const ofmLayer = ofmLayerRef.current;
    if (!map || !ofmLayer) return;

    if (showOfm) {
      ofmLayer.addTo(map);
    } else {
      map.removeLayer(ofmLayer);
    }
  }, [showOfm]);

  // Center on home base function
  function handleRecenter() {
    if (leafletMap.current) {
      leafletMap.current.setView([centerLat, centerLon], 10);
    }
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", minHeight: "500px" }}>
      {/* Dynamic style tag for Leaflet custom tooltips */}
      <style>{`
        .leaflet-tooltip-vfr {
          background-color: #1e3a8a;
          color: white;
          border: 1px solid #1d4ed8;
          border-radius: 4px;
          padding: 2px 6px;
          font-weight: 800;
          font-size: 0.72rem;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .leaflet-tooltip-vfr::before {
          border-top-color: #1e3a8a;
        }
        .leaflet-tooltip-ifr {
          background-color: #064e3b;
          color: #a7f3d0;
          border: 1px solid #047857;
          border-radius: 4px;
          padding: 2px 6px;
          font-weight: 700;
          font-size: 0.7rem;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .leaflet-tooltip-ifr::before {
          border-top-color: #064e3b;
        }
        .leaflet-container {
          font-family: inherit;
          background-color: #f1f5f9;
        }
        .custom-vfr-icon, .custom-ifr-icon, .custom-airport-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Loading Indicator (Non-blocking) */}
      {loading && (
        <div style={{
          position: "absolute",
          top: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          backgroundColor: "rgba(30, 41, 59, 0.85)", // Slate 800 background
          backdropFilter: "blur(8px)",
          color: "#f8fafc",
          padding: "6px 14px",
          borderRadius: "30px",
          fontSize: "0.8rem",
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          gap: "8px",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          pointerEvents: "none" // Let clicks pass through
        }}>
          <div style={{
            width: "12px",
            height: "12px",
            border: "2px solid rgba(255,255,255,0.2)",
            borderTop: "2px solid #38bdf8", // Light blue spinner
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite"
          }} />
          <span>Aggiornamento mappa...</span>
        </div>
      )}

      {/* Map Element */}
      <div
        ref={mapRef}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)"
        }}
      />

      {/* Control Panel overlay */}
      <div style={{
        position: "absolute",
        top: "16px",
        right: "16px",
        zIndex: 999,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        padding: "16px",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        width: "240px"
      }}>
        <h4 style={{ margin: "0 0 12px 0", fontSize: "0.95rem", fontWeight: 800, color: "var(--text)" }}>
          Filtri e Opzioni
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showAirspaces}
              onChange={(e) => setShowAirspaces(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Spazi Aerei (CTR/TMA)
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showAirports}
              onChange={(e) => setShowAirports(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Aeroporti & Campi Volo <span style={{ color: "#1e40af" }}>✈</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showVfr}
              onChange={(e) => setShowVfr(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Punti VFR <span style={{ color: "#3b82f6" }}>●</span>
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showIfr}
              onChange={(e) => setShowIfr(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Punti IFR (Fix/VOR) <span style={{ color: "#10b981" }}>▲</span>
          </label>

          <hr style={{ border: 0, borderTop: "1px solid var(--border)", margin: "6px 0" }} />

          <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={showOfm}
              onChange={(e) => setShowOfm(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Carta VFR (OpenFlightMaps)
          </label>

          <button
            onClick={handleRecenter}
            className="btn secondary"
            style={{
              marginTop: "8px",
              width: "100%",
              padding: "8px 12px",
              fontSize: "0.82rem",
              height: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6
            }}
          >
            <span>🎯</span> Centra su Base ({defaultBase})
          </button>
        </div>
      </div>
    </div>
  );
}
