"use client";

import { useState } from "react";

interface WeatherMapProps {
  lat: number;
  lon: number;
  zoom: number;
  timeParam: string; // YYYYMMDD/HH in UTC
  formattedDateStr: string;
}

export function WeatherMap({ lat, lon, zoom, timeParam, formattedDateStr }: WeatherMapProps) {
  const [layer, setLayer] = useState("rain-3h"); // Predefinito: precipitazioni

  const layers = [
    { id: "rain-3h", name: "☔ Precipitazioni", desc: "Mostra pioggia, neve e temporali previsti" },
    { id: "radar", name: "📡 Radar (Tempo Reale)", desc: "Radar meteorologico in tempo reale" },
    { id: "wind-10m", name: "💨 Vento", desc: "Velocità e direzione del vento al suolo (10m)" },
  ];

  // URL per l'embed di Ventusky
  // Nota: Ventusky richiede le coordinate separate da punto e virgola, es: p=lat;lon;zoom
  const iframeSrc = `https://embed.ventusky.com/?p=${lat.toFixed(3)};${lon.toFixed(3)};${zoom}&l=${layer}&t=${timeParam}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="between" style={{ flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
          Mappa impostata per il giorno: <strong>{formattedDateStr}</strong>
        </p>

        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {layers.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayer(l.id)}
              className={`pill ${layer === l.id ? "active" : ""}`}
              style={{
                cursor: "pointer",
                border: "1px solid var(--border)",
                backgroundColor: layer === l.id ? "var(--primary)" : "var(--border)",
                color: layer === l.id ? "white" : "var(--text)",
                padding: "6px 14px",
                fontSize: "0.85rem",
                borderRadius: 20,
                fontWeight: 700,
                transition: "all 0.2s ease"
              }}
              title={l.desc}
            >
              {l.name}
            </button>
          ))}
        </div>
      </div>

      <div style={{ 
        position: "relative", 
        width: "100%", 
        height: "480px", 
        borderRadius: 14, 
        overflow: "hidden", 
        border: "1px solid var(--border)", 
        boxShadow: "0 6px 20px rgba(0,0,0,0.04)" 
      }}>
        <iframe
          src={iframeSrc}
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0, display: "block" }}
          allowFullScreen
          loading="lazy"
        />
      </div>
    </div>
  );
}
