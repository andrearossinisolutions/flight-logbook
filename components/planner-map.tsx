"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { LOCAL_AIRFIELDS } from "@/lib/aeronautical-data";
import { ITALIAN_AIRPORTS } from "@/lib/weather";

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

// Ray-casting point-in-polygon algorithm
function isPointInPolygon(point: [number, number], vs: [number, number][]): boolean {
  const x = point[1]; // longitude
  const y = point[0]; // latitude

  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][1], yi = vs[i][0];
    const xj = vs[j][1], yj = vs[j][0];

    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }

  return inside;
}

// Normalize vertical limit strings (like GND, FL55, 1500 ft) into numerical feet
function parseLimitToFeet(limitStr: string): number {
  const clean = limitStr.trim().toUpperCase();
  if (clean === "GND" || clean === "SFC") return 0;
  if (clean === "UNLIMITED" || clean === "UNL") return 99999;
  
  // Flight Level (e.g. FL 95, FL95, FL 095)
  if (clean.startsWith("FL")) {
    const numStr = clean.replace("FL", "").trim();
    const val = parseInt(numStr, 10);
    if (!isNaN(val)) {
      return val * 100;
    }
  }
  
  // Feet (e.g. 1500 FT AMSL, 1500 FT AGL, 1500 FT)
  const match = clean.match(/(\d+)\s*FT/);
  if (match) {
    return parseInt(match[1], 10);
  }
  
  const matchPlain = clean.match(/^(\d+)$/);
  if (matchPlain) {
    return parseInt(matchPlain[1], 10);
  }
  
  return 0; // Default fallback
}

// Check if segment AB intersects segment CD
function segmentsIntersect(
  a: [number, number],
  b: [number, number],
  c: [number, number],
  d: [number, number]
): boolean {
  const ccw = (p1: [number, number], p2: [number, number], p3: [number, number]) => {
    return (p3[0] - p1[0]) * (p2[1] - p1[1]) > (p2[0] - p1[0]) * (p3[1] - p1[1]);
  };
  return ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);
}

// Check if flight segment p1-p2 crosses a polygon boundary or is contained inside it
function segmentIntersectsPolygon(p1: [number, number], p2: [number, number], poly: [number, number][]): boolean {
  for (let i = 0; i < poly.length; i++) {
    const nextIdx = (i + 1) % poly.length;
    if (segmentsIntersect(p1, p2, poly[i], poly[nextIdx])) {
      return true;
    }
  }
  if (isPointInPolygon(p1, poly) || isPointInPolygon(p2, poly)) {
    return true;
  }
  return false;
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
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Route Planning States
  const [departureInput, setDepartureInput] = useState("");
  const [arrivalInput, setArrivalInput] = useState("");
  const [routeDistance, setRouteDistance] = useState<number | null>(null);
  const [routeError, setRouteError] = useState("");
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [altitudeInput, setAltitudeInput] = useState("1000");
  const [ulmBasico, setUlmBasico] = useState(false);
  const [routeWaypoints, setRouteWaypoints] = useState<{ lat: number; lon: number; name: string }[]>([]);

  // Route Refs
  const routePolylineRef = useRef<L.Polyline | null>(null);
  const depMarkerRef = useRef<L.Marker | null>(null);
  const arrMarkerRef = useRef<L.Marker | null>(null);
  const routeMarkersRef = useRef<L.Marker[]>([]);

  // Great Circle Distance helper in Nautical Miles
  function calculateDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3440.065; // Earth radius in NM
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Resolve coordinates using local search first, then OSM Nominatim as fallback
  async function resolveCoordinates(query: string): Promise<{ lat: number; lon: number; name: string } | null> {
    const clean = query.trim().toUpperCase();
    if (!clean) return null;

    // 1. Search in certified Italian airports
    if (ITALIAN_AIRPORTS[clean]) {
      return {
        lat: ITALIAN_AIRPORTS[clean].lat,
        lon: ITALIAN_AIRPORTS[clean].lon,
        name: `${ITALIAN_AIRPORTS[clean].name} (${clean})`
      };
    }
    const matchingCertified = Object.entries(ITALIAN_AIRPORTS).find(([icao, apt]) => 
      apt.name.toUpperCase().includes(clean) || icao.includes(clean)
    );
    if (matchingCertified) {
      return {
        lat: matchingCertified[1].lat,
        lon: matchingCertified[1].lon,
        name: `${matchingCertified[1].name} (${matchingCertified[0]})`
      };
    }

    // 2. Search in local airfields / aviosuperfici
    const matchingLocal = LOCAL_AIRFIELDS.find(fld => 
      (fld.icao && fld.icao.toUpperCase() === clean) ||
      fld.name.toUpperCase().includes(clean)
    );
    if (matchingLocal) {
      return {
        lat: matchingLocal.lat,
        lon: matchingLocal.lon,
        name: `${matchingLocal.name} ${matchingLocal.icao ? `(${matchingLocal.icao})` : ""}`
      };
    }

    // 3. Fallback to OpenStreetMap/Nominatim Geocoding API
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
            name: data[0].display_name.split(",")[0]
          };
        }
      }
    } catch (err) {
      console.warn("Geocoding lookup failed:", err);
    }

    return null;
  }

  // Handle clear route
  const handleClearRoute = () => {
    const map = leafletMap.current;
    if (routePolylineRef.current && map) {
      map.removeLayer(routePolylineRef.current);
      routePolylineRef.current = null;
    }
    if (depMarkerRef.current && map) {
      map.removeLayer(depMarkerRef.current);
      depMarkerRef.current = null;
    }
    if (arrMarkerRef.current && map) {
      map.removeLayer(arrMarkerRef.current);
      arrMarkerRef.current = null;
    }
    if (map) {
      routeMarkersRef.current.forEach((m) => map.removeLayer(m));
    }
    routeMarkersRef.current = [];
    setRouteDistance(null);
    setRouteWaypoints([]);
    setRouteError("");
  };

  // Handle calculate route
  const handleCalculateRoute = async () => {
    handleClearRoute();
    setRouteError("");
    
    if (!departureInput.trim() || !arrivalInput.trim()) {
      setRouteError("Inserisci partenza e arrivo.");
      return;
    }

    setCalculatingRoute(true);
    try {
      const depRes = await resolveCoordinates(departureInput);
      if (!depRes) {
        setRouteError(`Impossibile trovare la partenza: "${departureInput}"`);
        setCalculatingRoute(false);
        return;
      }

      const arrRes = await resolveCoordinates(arrivalInput);
      if (!arrRes) {
        setRouteError(`Impossibile trovare l'arrivo: "${arrivalInput}"`);
        setCalculatingRoute(false);
        return;
      }

      // 1. Calculate bounding box of departure and arrival with buffer
      const minLat = Math.min(depRes.lat, arrRes.lat) - 0.8;
      const maxLat = Math.max(depRes.lat, arrRes.lat) + 0.8;
      const minLon = Math.min(depRes.lon, arrRes.lon) - 0.8;
      const maxLon = Math.max(depRes.lon, arrRes.lon) + 0.8;
      const bboxParam = `${minLon},${minLat},${maxLon},${maxLat}`;

      // 2. Fetch all candidates and airspaces in this bbox
      const [bboxAirspaces, bboxWaypoints, bboxAirports] = await Promise.all([
        fetch(`/api/planner/airspaces?bbox=${encodeURIComponent(bboxParam)}`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/planner/reporting-points?bbox=${encodeURIComponent(bboxParam)}`).then((r) => r.ok ? r.json() : []),
        fetch(`/api/planner/airports?bbox=${encodeURIComponent(bboxParam)}`).then((r) => r.ok ? r.json() : [])
      ]);

      const altFeet = parseInt(altitudeInput, 10) || 1000;
      
      // Airspaces that overlap with our altitude
      const activeAirspaces = ulmBasico
        ? bboxAirspaces.filter((space: any) => {
            const type = space.type?.toUpperCase() || "";
            const spaceClass = space.class?.toUpperCase() || "";

            // Avoid spaces of type D (Danger), P (Prohibited), R (Restricted)
            const isDPR = ["DANGER", "PROHIBITED", "RESTRICTED", "D", "P", "R"].includes(type);

            // Avoid all CTRs of any class that is not G
            const isCtrNotG = (type === "CTR") && (spaceClass !== "G");

            // Avoid CTA and TMA spaces
            const isCtaTma = ["CTA", "TMA"].includes(type);

            if (!isDPR && !isCtrNotG && !isCtaTma) return false;

            const lower = parseLimitToFeet(space.lowerLimit || "0");
            const upper = parseLimitToFeet(space.upperLimit || "99999");
            return altFeet >= lower && altFeet <= upper;
          })
        : [];

      // 3. Build candidates graph nodes
      const candidates: { lat: number; lon: number; name: string }[] = [];
      candidates.push({ lat: depRes.lat, lon: depRes.lon, name: depRes.name });

      bboxWaypoints.forEach((wp: any) => {
        candidates.push({ lat: wp.lat, lon: wp.lon, name: wp.code || wp.name });
      });

      bboxAirports.forEach((apt: any) => {
        candidates.push({ lat: apt.lat, lon: apt.lon, name: apt.icao || apt.name });
      });

      candidates.push({ lat: arrRes.lat, lon: arrRes.lon, name: arrRes.name });

      // Deduplicate coordinates
      const uniqueCandidates: { lat: number; lon: number; name: string }[] = [];
      candidates.forEach((cand) => {
        const exists = uniqueCandidates.some(
          (u) => Math.abs(u.lat - cand.lat) < 0.0001 && Math.abs(u.lon - cand.lon) < 0.0001
        );
        if (!exists) {
          uniqueCandidates.push(cand);
        }
      });

      // Find start and end indices
      const startIndex = 0;
      const endIndex = uniqueCandidates.findIndex(
        (c) => Math.abs(c.lat - arrRes.lat) < 0.0001 && Math.abs(c.lon - arrRes.lon) < 0.0001
      );

      if (endIndex === -1) {
        setRouteError("Impossibile mappare la destinazione nel grafo.");
        setCalculatingRoute(false);
        return;
      }

      // Check if a segment crosses any active airspace
      const isSegmentValid = (p1: { lat: number; lon: number }, p2: { lat: number; lon: number }) => {
        const pt1: [number, number] = [p1.lat, p1.lon];
        const pt2: [number, number] = [p2.lat, p2.lon];
        
        for (const space of activeAirspaces) {
          if (space.coordinates && space.coordinates.length > 2) {
            if (segmentIntersectsPolygon(pt1, pt2, space.coordinates)) {
              return false;
            }
          }
        }
        return true;
      };

      // 4. Dijkstra algorithm
      const n = uniqueCandidates.length;
      const dists = new Array(n).fill(Infinity);
      const prev = new Array(n).fill(-1);
      const visited = new Array(n).fill(false);

      dists[startIndex] = 0;

      for (let i = 0; i < n; i++) {
        let u = -1;
        let minDist = Infinity;
        for (let j = 0; j < n; j++) {
          if (!visited[j] && dists[j] < minDist) {
            minDist = dists[j];
            u = j;
          }
        }

        if (u === -1) break;
        if (u === endIndex) break;
        visited[u] = true;

        const nodeU = uniqueCandidates[u];

        for (let v = 0; v < n; v++) {
          if (visited[v]) continue;

          const nodeV = uniqueCandidates[v];
          if (isSegmentValid(nodeU, nodeV)) {
            const d = calculateDistanceNm(nodeU.lat, nodeU.lon, nodeV.lat, nodeV.lon);
            const altDist = dists[u] + d;
            if (altDist < dists[v]) {
              dists[v] = altDist;
              prev[v] = u;
            }
          }
        }
      }

      if (dists[endIndex] === Infinity) {
        setRouteError("Nessun percorso sicuro trovato a questa quota evitando spazi aerei controllati. Prova a cambiare quota o a disattivare ULM Basico.");
        setCalculatingRoute(false);
        return;
      }

      // Reconstruct path
      const path: { lat: number; lon: number; name: string }[] = [];
      let curr = endIndex;
      while (curr !== -1) {
        path.push(uniqueCandidates[curr]);
        curr = prev[curr];
      }
      path.reverse();

      setRouteWaypoints(path);
      setRouteDistance(dists[endIndex]);

      const map = leafletMap.current;
      if (map) {
        // Draw route line
        const latLngs = path.map((wp) => [wp.lat, wp.lon] as [number, number]);
        const polyline = L.polyline(latLngs, {
          color: "#d946ef",
          weight: 4.5,
          opacity: 0.85,
          dashArray: "8, 6"
        }).addTo(map);
        routePolylineRef.current = polyline;

        // Custom departure marker
        const depIcon = L.divIcon({
          html: `
            <div style="
              background-color: #10b981;
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 0.7rem;
            ">
              D
            </div>
          `,
          className: "custom-route-dep",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const depMarker = L.marker([depRes.lat, depRes.lon], { icon: depIcon })
          .addTo(map)
          .bindPopup(`<b>Partenza:</b><br>${depRes.name}`);
        depMarkerRef.current = depMarker;

        // Custom arrival marker
        const arrIcon = L.divIcon({
          html: `
            <div style="
              background-color: #ef4444;
              color: white;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              border: 2px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 800;
              font-size: 0.7rem;
            ">
              A
            </div>
          `,
          className: "custom-route-arr",
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        const arrMarker = L.marker([arrRes.lat, arrRes.lon], { icon: arrIcon })
          .addTo(map)
          .bindPopup(`<b>Arrivo:</b><br>${arrRes.name}`);
        arrMarkerRef.current = arrMarker;

        // Plot intermediate waypoint markers/tooltips on map
        const markers: L.Marker[] = [];
        for (let idx = 1; idx < path.length - 1; idx++) {
          const wp = path[idx];
          const wpIcon = L.divIcon({
            html: `
              <div style="
                background-color: #d946ef;
                color: white;
                width: 14px;
                height: 14px;
                border-radius: 50%;
                border: 2px solid white;
                box-shadow: 0 1px 6px rgba(0,0,0,0.3);
              "></div>
            `,
            className: "custom-route-wp",
            iconSize: [14, 14],
            iconAnchor: [7, 7]
          });

          const marker = L.marker([wp.lat, wp.lon], { icon: wpIcon })
            .addTo(map)
            .bindTooltip(`${wp.name}`, {
              permanent: false,
              direction: "top"
            });
          markers.push(marker);
        }
        routeMarkersRef.current = markers;

        // Fit map bounds to view whole route
        const bounds = L.latLngBounds(latLngs);
        map.fitBounds(bounds, { padding: [60, 60] });
      }
    } catch (err) {
      console.error(err);
      setRouteError("Errore durante il calcolo della rotta.");
    } finally {
      setCalculatingRoute(false);
    }
  };

  // Layer groups references for toggling
  const airspacesLayerGroup = useRef<L.LayerGroup | null>(null);
  const vfrLayerGroup = useRef<L.LayerGroup | null>(null);
  const ifrLayerGroup = useRef<L.LayerGroup | null>(null);
  const airportsLayerGroup = useRef<L.LayerGroup | null>(null);
  const ofmLayerRef = useRef<L.TileLayer | null>(null);

  // References to states for the map click handler to access latest state values
  const airspacesRef = useRef<Airspace[]>([]);
  const showAirspacesRef = useRef<boolean>(true);

  // Keep references updated
  useEffect(() => {
    airspacesRef.current = airspaces;
  }, [airspaces]);

  useEffect(() => {
    showAirspacesRef.current = showAirspaces;
  }, [showAirspaces]);

  // Helper to color airspaces by class/type aligning with ICAO standards
  function getAirspaceColor(airspaceClass: string, type: string) {
    const t = type.toUpperCase();
    const c = airspaceClass.toUpperCase();

    if (t === "DANGER") return "#eab308";
    if (t === "PROHIBITED") return "#dc2626";
    if (t === "RESTRICTED") return "#ea580c";
    if (c === "A") return "#7c3aed";
    if (c === "C") return "#db2777";
    if (c === "D") return "#2563eb";
    return "#4b5563";
  }

  function getAirspaceStyle(airspace: Airspace) {
    const type = airspace.type.toUpperCase();
    const airspaceClass = airspace.class.toUpperCase();
    const color = getAirspaceColor(airspaceClass, airspace.type);

    if (type === "DANGER" || type === "PROHIBITED" || type === "RESTRICTED") {
      return { color, fillColor: color, fillOpacity: 0.12, weight: 2, dashArray: "4, 6" };
    }

    if (airspaceClass === "A") {
      return { color, fillColor: "#c084fc", fillOpacity: 0.12, weight: 2.5 };
    } else if (airspaceClass === "C") {
      return { color, fillColor: "#f472b6", fillOpacity: 0.12, weight: 2 };
    } else if (airspaceClass === "D") {
      return { color, fillColor: "#93c5fd", fillOpacity: 0.1, weight: 2 };
    } else if (type === "ATZ" || type === "MATZ") {
      return { color, fillColor: "#93c5fd", fillOpacity: 0.08, weight: 1.5, dashArray: "2, 4" };
    }

    return { color, fillColor: "#9ca3af", fillOpacity: 0.06, weight: 1.5 };
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

  // Initialize Map & set up bounding box fetching & click events
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

      // Special base marker
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

      // Set up map click handler to detect and list all overlapping airspaces under the cursor
      map.on("click", (e) => {
        if (!showAirspacesRef.current) return;

        const clickedPt: [number, number] = [e.latlng.lat, e.latlng.lng];
        const containing = airspacesRef.current.filter((space) => {
          return space.coordinates && space.coordinates.length > 2 && isPointInPolygon(clickedPt, space.coordinates);
        });

        if (containing.length === 0) return;

        let popupContent = `
          <div style="font-family: inherit; font-size: 0.88rem; padding: 4px; max-width: 280px; max-height: 280px; overflow-y: auto;">
            <h4 style="margin: 0 0 10px 0; font-weight: 800; border-bottom: 1px solid var(--border); padding-bottom: 6px; font-size: 0.95rem;">
              Spazi Aerei Rilevati (${containing.length})
            </h4>
            <div style="display: flex; flex-direction: column; gap: 12px;">
        `;

        containing.forEach((space) => {
          const typeLabel = space.type === "DANGER" ? "Zona Pericolosa" :
                            space.type === "PROHIBITED" ? "Zona Vietata" :
                            space.type === "RESTRICTED" ? "Zona Regolamentata" : space.type;
          
          const color = getAirspaceColor(space.class, space.type);

          popupContent += `
            <div style="border-left: 3px solid ${color}; padding-left: 8px;">
              <div style="font-weight: 800; color: ${color}; font-size: 0.88rem;">${space.name}</div>
              <div style="font-size: 0.8rem; margin-top: 2px;">
                Tipo: <b>${typeLabel} (${space.class})</b>
              </div>
              <div style="font-size: 0.8rem; margin-top: 1px;">
                Limiti: <b>${space.lowerLimit} - ${space.upperLimit}</b>
              </div>
            </div>
          `;
        });

        popupContent += `
            </div>
          </div>
        `;

        L.popup()
          .setLatLng(e.latlng)
          .setContent(popupContent)
          .openOn(map);
      });

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

    // 1. Plot Airspaces (click popup disabled on individual polygon, handled at map click level instead)
    if (showAirspaces) {
      airspaces.forEach((airspace) => {
        if (!airspace.coordinates || airspace.coordinates.length === 0) return;

        const style = getAirspaceStyle(airspace);
        const polygon = L.polygon(airspace.coordinates, {
          ...style,
          interactive: false // Turn off click blocking to let clicks reach map & lower polygons
        });

        polygon.addTo(airGroup);
      });
    }

    // 2. Plot Airports & Airfields (Aviosuperfici)
    if (showAirports) {
      const airportSvg = `
        <svg width="22" height="22" viewBox="0 0 100 100" style="display: block;">
          <circle cx="50" cy="50" r="40" fill="#1e40af" stroke="white" stroke-width="8" />
          <path d="M50,15 L50,85 M20,50 L80,50 M50,45 L25,65 M50,45 L75,65 M50,80 L35,85 M50,80 L65,85" stroke="white" stroke-width="8" stroke-linecap="round" fill="none" />
        </svg>
      `;

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

        marker.bindTooltip(airport.icao || airport.name, {
          permanent: false,
          direction: "top",
          offset: [0, -10]
        });

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

      {/* Route Planner Panel */}
      <div style={{
        position: "absolute",
        top: "96px",
        left: "16px",
        zIndex: 999,
        backgroundColor: "var(--card)",
        backdropFilter: "blur(12px)",
        padding: "16px",
        borderRadius: "16px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        border: "1px solid var(--border)",
        width: "260px",
        display: "flex",
        flexDirection: "column",
        gap: "12px"
      }}>
        <h4 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 800, color: "var(--text)", display: "flex", alignItems: "center", gap: 6 }}>
          <span>✈️</span> Pianificatore Tratta
        </h4>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Partenza</label>
          <input
            type="text"
            placeholder="Es. LIML, Linate, Dovera..."
            value={departureInput}
            onChange={(e) => setDepartureInput(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--text)",
              fontSize: "0.85rem",
              width: "100%"
            }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Arrivo</label>
          <input
            type="text"
            placeholder="Es. LIME, Bergamo, Bresso..."
            value={arrivalInput}
            onChange={(e) => setArrivalInput(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              border: "1px solid var(--border)",
              backgroundColor: "var(--background)",
              color: "var(--text)",
              fontSize: "0.85rem",
              width: "100%"
            }}
          />
        </div>

        {/* Quota and ULM Options */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Quota (ft)</label>
            <input
              type="number"
              value={altitudeInput}
              onChange={(e) => setAltitudeInput(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: "var(--background)",
                color: "var(--text)",
                fontSize: "0.85rem",
                width: "100%"
              }}
            />
          </div>
          
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", cursor: "pointer", fontWeight: 600, marginTop: 18 }}>
            <input
              type="checkbox"
              checked={ulmBasico}
              onChange={(e) => setUlmBasico(e.target.checked)}
              style={{ width: 16, height: 16, cursor: "pointer" }}
            />
            Evita spazi aerei
          </label>
        </div>

        {routeError && (
          <div style={{ color: "#ef4444", fontSize: "0.78rem", fontWeight: 600 }}>
            ⚠️ {routeError}
          </div>
        )}

        {routeDistance !== null && (
          <div style={{
            backgroundColor: "rgba(217, 70, 239, 0.08)",
            border: "1px solid rgba(217, 70, 239, 0.15)",
            borderRadius: "8px",
            padding: "10px",
            textAlign: "center"
          }}>
            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}>
              Distanza Totale
            </div>
            <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "#d946ef", marginTop: 2 }}>
              {routeDistance.toFixed(1)} <span style={{ fontSize: "0.85rem" }}>NM</span>
            </div>
          </div>
        )}

        {/* Navigation waypoints log */}
        {routeWaypoints.length > 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Registro Nav (Tratta)</label>
            <div style={{
              maxHeight: "150px",
              overflowY: "auto",
              padding: "8px",
              backgroundColor: "var(--background)",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: "0.78rem",
              display: "flex",
              flexDirection: "column",
              gap: "6px"
            }}>
              {routeWaypoints.map((wp, i) => {
                if (i === 0) return <div key={i} style={{ fontWeight: 600 }}>🛫 {wp.name} (DEP)</div>;
                const prevWp = routeWaypoints[i - 1];
                const legDist = calculateDistanceNm(prevWp.lat, prevWp.lon, wp.lat, wp.lon);
                const isArr = i === routeWaypoints.length - 1;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: 4, gap: 10 }}>
                    <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {isArr ? "🛬" : "📍"} {wp.name}
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--text-muted)", flexShrink: 0 }}>
                      +{legDist.toFixed(1)} NM
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button
            onClick={handleCalculateRoute}
            disabled={calculatingRoute}
            className="btn"
            style={{
              flex: 1,
              padding: "8px 12px",
              fontSize: "0.82rem",
              height: "auto",
              minHeight: "initial",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            {calculatingRoute ? "..." : "Calcola"}
          </button>
          
          {(routeDistance !== null || departureInput || arrivalInput) && (
            <button
              onClick={() => {
                setDepartureInput("");
                setArrivalInput("");
                handleClearRoute();
              }}
              className="btn secondary"
              style={{
                padding: "8px 12px",
                fontSize: "0.82rem",
                height: "auto",
                minHeight: "initial"
              }}
            >
              Azzera
            </button>
          )}
        </div>
      </div>

      {/* Loading Indicator (Non-blocking) */}
      {loading && (
        <div style={{
          position: "absolute",
          top: "96px",
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
          overflow: "hidden"
        }}
      />

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsFilterOpen(!isFilterOpen)}
        style={{
          position: "absolute",
          top: "96px",
          right: "16px",
          zIndex: 1000,
          backgroundColor: isFilterOpen ? "var(--primary)" : "var(--card)",
          color: isFilterOpen ? "white" : "var(--text)",
          border: "1px solid var(--border)",
          width: "42px",
          height: "42px",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.15)",
          transition: "all 0.2s ease",
          fontSize: "1.2rem"
        }}
        title="Filtri Mappa"
      >
        {isFilterOpen ? "✕" : "🎛️"}
      </button>

      {/* Control Panel overlay */}
      {isFilterOpen && (
        <div style={{
          position: "absolute",
          top: "148px",
          right: "16px",
          zIndex: 999,
          backgroundColor: "var(--card)",
          backdropFilter: "blur(12px)",
          padding: "16px",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
          border: "1px solid var(--border)",
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
      )}
    </div>
  );
}
