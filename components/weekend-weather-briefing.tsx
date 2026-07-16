"use client";

import { useState } from "react";
import { getWeekendWeatherAction } from "@/app/briefing/actions";

export default function WeekendWeatherBriefing({ defaultBase }: { defaultBase: string }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const loadWeather = async () => {
    setLoading(true);
    setError(null);
    const res = await getWeekendWeatherAction(defaultBase);
    if (res.error) {
      setError(res.error);
    } else {
      setData(res);
    }
    setLoading(false);
  };

  return (
    <div id="weekend-weather" className="card" style={{ marginTop: 48, scrollMarginTop: 64, padding: "28px 32px" }}>
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.4rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 10 }}>
        ☀️ Meteo Weekend Generico
      </h2>
      <p className="muted" style={{ fontSize: "0.9rem", marginBottom: 20 }}>
        Previsioni per Venerdì, Sabato e Domenica con indice di volabilità VFR nel raggio di 100km dalla tua base di <strong>{defaultBase.toUpperCase()}</strong>.
      </p>

      {!data && !loading && (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <button type="button" onClick={loadWeather} className="btn" style={{ fontWeight: 700 }}>
            ☁️ Carica Meteo Weekend
          </button>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
          <div className="spinner" style={{ margin: "0 auto 16px" }}></div>
          Caricamento delle previsioni meteorologiche da Open-Meteo...
        </div>
      )}

      {error && (
        <div className="error" style={{ padding: 12, borderRadius: 8, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {data && data.success && (
        <div>
          {/* Griglia giorni del Weekend */}
          <div className="grid grid-3" style={{ gap: 16, marginBottom: 28 }}>
            {["friday", "saturday", "sunday"].map((dayKey) => {
              const dayData = data.baseWeather[dayKey];
              const dayLabel = dayKey === "friday" ? `Venerdì (${data.dates.friday})` : dayKey === "saturday" ? `Sabato (${data.dates.saturday})` : `Domenica (${data.dates.sunday})`;
              
              if (!dayData) return null;

              return (
                <div key={dayKey} className="card" style={{ padding: 20, backgroundColor: "var(--bg-light)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <h4 style={{ margin: "0 0 12px", color: "var(--primary)", fontSize: "1rem", fontWeight: 800 }}>{dayLabel}</h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                      <span style={{ fontSize: "2rem" }}>{dayData.weatherEmoji}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>{dayData.weatherText}</div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Temp: {dayData.tempMin}°C / {dayData.tempMax}°C</div>
                      </div>
                    </div>
                    
                    <div style={{ fontSize: "0.85rem", lineHeight: 1.6, color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 12 }}>
                      <div><strong>Vento:</strong> {dayData.windSpeed} km/h (Raffiche: {dayData.windGusts} km/h)</div>
                      <div><strong>Precipitazioni:</strong> {dayData.precipSum} mm ({dayData.precipProb}%)</div>
                    </div>
                  </div>

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px dotted var(--border)" }}>
                    <div style={{ fontSize: "0.85rem", marginBottom: 4 }}>Indice Volo VFR:</div>
                    <div style={{ color: dayData.vfrColor, fontWeight: 800, fontSize: "1.05rem" }}>
                      {dayData.vfrLabel}
                    </div>
                    {dayData.vfrReasons !== "Nessuna criticità" && (
                      <div style={{ fontSize: "0.75rem", color: "#b45309", marginTop: 4, fontStyle: "italic" }}>
                        ⚠️ {dayData.vfrReasons}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dintorni 100km */}
          {data.nearbyWeather && data.nearbyWeather.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 12 }}>🗺️ Indice Volabilità nei dintorni (100 km)</h3>
              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
                      <th style={{ padding: "10px 12px" }}>Aeroporto</th>
                      <th style={{ padding: "10px 12px" }}>Venerdì</th>
                      <th style={{ padding: "10px 12px" }}>Sabato</th>
                      <th style={{ padding: "10px 12px" }}>Domenica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.nearbyWeather.map((apt: any) => (
                      <tr key={apt.icao} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "12px", fontWeight: 700 }}>
                          {apt.icao} <span style={{ fontWeight: 400, fontSize: "0.8rem", color: "var(--text-muted)" }}>({apt.distanceKm} km)</span>
                        </td>
                        <td style={{ padding: "12px", color: apt.weather.friday?.vfrColor, fontWeight: 700 }}>
                          {apt.weather.friday?.weatherEmoji} {apt.weather.friday?.vfrLabel.replace(" 🟢", "").replace(" 🟡", "").replace(" 🔴", "") || "N/D"}
                        </td>
                        <td style={{ padding: "12px", color: apt.weather.saturday?.vfrColor, fontWeight: 700 }}>
                          {apt.weather.saturday?.weatherEmoji} {apt.weather.saturday?.vfrLabel.replace(" 🟢", "").replace(" 🟡", "").replace(" 🔴", "") || "N/D"}
                        </td>
                        <td style={{ padding: "12px", color: apt.weather.sunday?.vfrColor, fontWeight: 700 }}>
                          {apt.weather.sunday?.weatherEmoji} {apt.weather.sunday?.vfrLabel.replace(" 🟢", "").replace(" 🟡", "").replace(" 🔴", "") || "N/D"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
