import { requireUser } from "@/lib/require-user";
import { AppShell } from "@/components/app-shell";
import { 
  fetchMetar, 
  fetchTaf, 
  getRelativeHumidity, 
  getSpread, 
  getFltCatStyle, 
  formatCloudLayer, 
  formatWind, 
  formatVisibilityKm,
  decodeWeatherString 
} from "@/lib/weather";
import Link from "next/link";
import type { Route } from "next";

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const { icao } = await searchParams;
  const targetIcao = (typeof icao === "string" ? icao.trim().toUpperCase() : "LIML") || "LIML";

  // Fetch METAR and TAF in parallel (revalidated after 5 minutes)
  const [metar, taf] = await Promise.all([
    fetchMetar(targetIcao),
    fetchTaf(targetIcao)
  ]);

  // Formattatore per le date del bollettino
  function formatReportTime(isoString: string | undefined | null) {
    if (!isoString) return "N/D";
    const d = new Date(isoString);
    return d.toLocaleString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome"
    }) + " (Locali)";
  }

  // Formattatore per le date dei periodi TAF
  function formatTafTime(seconds: number) {
    const d = new Date(seconds * 1000);
    return d.toLocaleString("it-IT", {
      weekday: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Europe/Rome"
    });
  }

  // Formattatore per indicatore di cambiamento del TAF
  function formatChangeIndicator(change: string | null | undefined, prob: number | null | undefined) {
    const base = change?.toUpperCase();
    if (!base) return "Condizioni iniziali";
    
    let label = base;
    if (base === "BECMG") label = "In evoluzione (BECMG)";
    else if (base === "TEMPO") label = "Temporaneamente (TEMPO)";
    else if (base === "FM") label = "Da ora in poi (FM)";
    else if (base.startsWith("PROB")) label = `Probabilità ${prob || base.replace("PROB", "")}%`;
    
    if (prob && !base.startsWith("PROB")) {
      label = `Probabilità ${prob}% (${base})`;
    }
    
    return label;
  }

  // Calcola il tempo trascorso dall'osservazione METAR
  function getTimeAgo(obsTimeSeconds: number | undefined | null) {
    if (!obsTimeSeconds) return "";
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = now - obsTimeSeconds;
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffMinutes < 1) return "adesso";
    if (diffMinutes < 60) return `${diffMinutes} m fa`;
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    return `${diffHours} h e ${remainingMinutes} m fa`;
  }

  const fltCatStyle = metar ? getFltCatStyle(metar.fltCat) : null;
  const humidity = metar ? getRelativeHumidity(metar.temp, metar.dewp) : 0;
  const tempSpread = metar ? getSpread(metar.temp, metar.dewp) : 0;

  return (
    <AppShell 
      title="Briefing Meteo" 
      subtitle={`Dati aeronautici METAR e TAF per la pianificazione dei voli.`}
    >
      {/* Search and Quick Filters */}
      <div className="card no-print" style={{ marginBottom: 24, padding: "16px 20px" }}>
        <div className="between" style={{ gap: 16 }}>
          <form method="GET" action="/briefing" className="row" style={{ flex: 1, gap: 12 }}>
            <div className="field" style={{ flex: 1, minWidth: 200, gap: 0 }}>
              <input
                type="text"
                name="icao"
                defaultValue={targetIcao}
                placeholder="Inserisci codice ICAO (es. LIML, LIME, LIMC)"
                className="input"
                style={{ textTransform: "uppercase", fontSize: "1rem", height: 44 }}
              />
            </div>
            <button type="submit" className="btn" style={{ height: 44, padding: "0 24px" }}>
              Carica Meteo
            </button>
          </form>
          
          <div className="row" style={{ gap: 8 }}>
            <span className="muted" style={{ fontSize: "0.9rem" }}>Preimpostati:</span>
            <Link href="/briefing?icao=LIML" className={`pill ${targetIcao === "LIML" ? "active" : ""}`} style={{ cursor: "pointer", textDecoration: "none", backgroundColor: targetIcao === "LIML" ? "var(--primary)" : "var(--border)", color: targetIcao === "LIML" ? "white" : "var(--text)" }}>
              Linate (LIML)
            </Link>
            <Link href="/briefing?icao=LIME" className={`pill ${targetIcao === "LIME" ? "active" : ""}`} style={{ cursor: "pointer", textDecoration: "none", backgroundColor: targetIcao === "LIME" ? "var(--primary)" : "var(--border)", color: targetIcao === "LIME" ? "white" : "var(--text)" }}>
              Bergamo (LIME)
            </Link>
            <Link href="/briefing?icao=LIMC" className={`pill ${targetIcao === "LIMC" ? "active" : ""}`} style={{ cursor: "pointer", textDecoration: "none", backgroundColor: targetIcao === "LIMC" ? "var(--primary)" : "var(--border)", color: targetIcao === "LIMC" ? "white" : "var(--text)" }}>
              Malpensa (LIMC)
            </Link>
          </div>
        </div>
      </div>

      {/* If airport is not found or API failed */}
      {!metar && !taf ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px", borderColor: "var(--danger)" }}>
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <h2 style={{ marginTop: 16 }}>Nessun dato disponibile</h2>
          <p className="muted" style={{ maxWidth: 500, margin: "8px auto 24px" }}>
            Non siamo riusciti a recuperare i dati meteo per la stazione <strong>{targetIcao}</strong>. 
            Verifica che il codice ICAO sia corretto o riprova più tardi.
          </p>
          <Link href="/briefing?icao=LIML" className="btn secondary">
            Torna a Linate (LIML)
          </Link>
        </div>
      ) : (
        <div className="grid" style={{ gap: 24 }}>
          
          {/* AIRPORT SUMMARY & FLIGHT CATEGORY */}
          {metar && (
            <div className="card" style={{ 
              background: "linear-gradient(135deg, var(--card) 0%, rgba(246, 248, 251, 0.5) 100%)",
              borderLeft: `6px solid ${fltCatStyle?.color || "var(--border)"}`
            }}>
              <div className="between" style={{ alignItems: "flex-start", gap: 16 }}>
                <div>
                  <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                    Stazione Meteo
                  </span>
                  <h2 style={{ margin: "4px 0 8px 0", fontSize: "1.75rem", fontWeight: 800 }}>
                    {metar.icaoId} - {metar.name || "Aeroporto"}
                  </h2>
                  <div className="row" style={{ gap: 16 }}>
                    <span className="muted" style={{ fontSize: "0.9rem" }}>
                      📍 Elevazione: <strong>{metar.elev} m (~{Math.round(metar.elev * 3.28084)} ft)</strong>
                    </span>
                    <span className="muted" style={{ fontSize: "0.9rem" }}>
                      🕒 Rilevamento: <strong>{formatReportTime(metar.reportTime)}</strong> ({getTimeAgo(metar.obsTime)})
                    </span>
                  </div>
                </div>

                {fltCatStyle && (
                  <div style={{ 
                    backgroundColor: fltCatStyle.bg, 
                    color: fltCatStyle.color, 
                    border: fltCatStyle.border,
                    borderRadius: 14, 
                    padding: "10px 18px", 
                    fontWeight: 800, 
                    fontSize: "1.1rem",
                    textAlign: "center",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
                  }}>
                    {fltCatStyle.label}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* METAR DECODED DETAILS */}
          {metar && (
            <div>
              <h3 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span>✈️</span> Condizioni Attuali (METAR)
              </h3>
              
              <div className="weather-grid">
                
                {/* WIND CARD */}
                <div className="weather-card">
                  <div className="between">
                    <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>VENTO</span>
                    <span style={{ fontSize: "1.2rem" }}>💨</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                    {/* Visual Wind Compass Arrow */}
                    {!isNaN(Number(metar.wdir)) ? (
                      <div style={{ position: "relative", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="50" height="50" viewBox="0 0 60 60">
                          <circle cx="30" cy="30" r="26" stroke="var(--border)" strokeWidth="2" fill="none" />
                          <text x="30" y="13" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--muted)">N</text>
                          {/* Rotating Arrow representing where the wind blows (comes from top and blows to center) */}
                          <g transform={`rotate(${Number(metar.wdir)} 30 30)`}>
                            <line x1="30" y1="18" x2="30" y2="42" stroke="var(--primary)" strokeWidth="3" />
                            <polygon points="30,42 26,34 34,34" fill="var(--primary)" />
                          </g>
                        </svg>
                      </div>
                    ) : (
                      <div style={{ width: 50, height: 50, borderRadius: "50%", border: "2px dashed var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700, color: "var(--muted)" }}>
                        VRB
                      </div>
                    )}
                    <div>
                      <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                        {metar.wspd} <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>kt</span>
                      </div>
                      <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
                        {formatWind(metar.wdir, metar.wspd, metar.wgst)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* TEMPERATURE & HUMIDITY */}
                <div className="weather-card">
                  <div className="between">
                    <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>TEMP & UMIDITÀ</span>
                    <span style={{ fontSize: "1.2rem" }}>🌡️</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                      {metar.temp}°C
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
                      Dewpoint: {metar.dewp}°C · Spread: {tempSpread}°C
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
                      Umidità Relativa: <strong>{humidity}%</strong>
                    </div>
                  </div>
                </div>

                {/* VISIBILITY */}
                <div className="weather-card">
                  <div className="between">
                    <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>VISIBILITÀ</span>
                    <span style={{ fontSize: "1.2rem" }}>👁️</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                      {formatVisibilityKm(metar.visib).primary}
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                      {formatVisibilityKm(metar.visib).secondary}
                    </div>
                  </div>
                </div>

                {/* QNH PRESSURE */}
                <div className="weather-card">
                  <div className="between">
                    <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>PRESSIONE (QNH)</span>
                    <span style={{ fontSize: "1.2rem" }}>⏲️</span>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                      Q{metar.altim} <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>hPa</span>
                    </div>
                    <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                      Standard: {(metar.altim / 1013.25).toFixed(2)} atm
                    </div>
                  </div>
                </div>

              </div>

              {/* CLOUDS SECTION */}
              <div className="card" style={{ marginBottom: 24 }}>
                <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>Copertura Nuvolosa</span>
                <div style={{ marginTop: 12 }}>
                  {metar.cover === "CAVOK" ? (
                    <div className="row" style={{ gap: 8 }}>
                      <span style={{ color: "var(--primary)" }}>✓</span>
                      <span><strong>CAVOK</strong> - Cielo e visibilità OK. Nessuna nube sotto i 5000 ft o l'altezza minima di settore (MSA), nessun cumulonembo (CB) o cumulo congesto (TCU), e nessun fenomeno meteorologico significativo.</span>
                    </div>
                  ) : metar.clouds && metar.clouds.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {metar.clouds.map((cloud, i) => (
                        <div key={i} className="row" style={{ gap: 10 }}>
                          <span className="pill" style={{ backgroundColor: "var(--border)", color: "var(--text)", fontSize: "0.8rem", padding: "2px 8px" }}>
                            {cloud.cover}
                          </span>
                          <span>{formatCloudLayer(cloud)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="row" style={{ gap: 8 }}>
                      <span>☁️</span>
                      <span>Nessuna copertura nuvolosa rilevata (cielo sereno o NSC).</span>
                    </div>
                  )}
                </div>
              </div>

              {/* RAW METAR */}
              <div className="card" style={{ padding: "16px 20px" }}>
                <div className="between" style={{ marginBottom: 8 }}>
                  <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>METAR ORIGINALE (RAW)</span>
                </div>
                <div className="terminal-box" style={{ margin: 0 }}>
                  {metar.rawOb}
                </div>
              </div>

            </div>
          )}

          {/* TAF FORECAST TIMELINE */}
          {taf && (
            <div style={{ marginTop: 12 }}>
              <h3 style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <span>📅</span> Previsioni di Aeroporto (TAF)
              </h3>
              
              <div className="card" style={{ marginBottom: 24, padding: "16px 20px" }}>
                <div className="between" style={{ marginBottom: 8 }}>
                  <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>TAF ORIGINALE (RAW)</span>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    Bollettino emesso il: {formatReportTime(taf.issueTime)}
                  </span>
                </div>
                <div className="terminal-box" style={{ margin: 0, color: "#10b981" }}>
                  {taf.rawTAF}
                </div>
              </div>

              <div className="timeline-container">
                {taf.fcsts.map((fcst, index) => {
                  const hasClouds = fcst.clouds && fcst.clouds.length > 0;
                  const changeLabel = formatChangeIndicator(fcst.fcstChange, fcst.probability);
                  
                  // Seleziona un colore bordo/sfondo per la card in base al tipo di cambiamento
                  let itemBorder = "1px solid var(--border)";
                  let itemBg = "var(--card)";
                  let itemHeaderColor = "var(--text)";
                  
                  if (fcst.fcstChange === "TEMPO") {
                    itemBg = "rgba(245, 158, 11, 0.03)";
                    itemBorder = "1px solid rgba(245, 158, 11, 0.2)";
                    itemHeaderColor = "#b45309";
                  } else if (fcst.fcstChange === "BECMG") {
                    itemBg = "rgba(37, 99, 235, 0.03)";
                    itemBorder = "1px solid rgba(37, 99, 235, 0.2)";
                    itemHeaderColor = "#1d4ed8";
                  } else if (!fcst.fcstChange) {
                    itemBg = "rgba(31, 111, 91, 0.03)";
                    itemBorder = "1px solid rgba(31, 111, 91, 0.2)";
                    itemHeaderColor = "var(--primary-strong)";
                  }

                  return (
                    <div key={index} className="timeline-item" style={{ border: itemBorder, background: itemBg }}>
                      <div className="timeline-dot" style={{ 
                        background: fcst.fcstChange === "TEMPO" ? "#f59e0b" : fcst.fcstChange === "BECMG" ? "#2563eb" : "var(--primary)",
                        borderColor: "var(--bg)"
                      }} />
                      
                      <div className="between" style={{ marginBottom: 12, alignItems: "flex-start", gap: 12 }}>
                        <div>
                          <span style={{ 
                            fontSize: "0.85rem", 
                            fontWeight: 800, 
                            color: itemHeaderColor, 
                            textTransform: "uppercase",
                            letterSpacing: "0.03em"
                          }}>
                            {changeLabel}
                          </span>
                          <div style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: 4 }}>
                            ⏱️ Da: {formatTafTime(fcst.timeFrom)} a: {formatTafTime(fcst.timeTo)}
                          </div>
                        </div>

                        {fcst.wxString && (
                          <div className="pill" style={{ backgroundColor: "#fee2e2", color: "#b91c1c", fontSize: "0.85rem" }}>
                            ⚠️ {decodeWeatherString(fcst.wxString)}
                          </div>
                        )}
                      </div>

                      <div className="grid grid-3" style={{ gap: 12, fontSize: "0.9rem" }}>
                        {/* Vento Previsto */}
                        <div>
                          <strong className="muted">Vento:</strong>
                          <div style={{ marginTop: 4 }}>
                            {fcst.wdir !== null && fcst.wspd !== null ? (
                              <span>{formatWind(fcst.wdir, fcst.wspd, fcst.wgst)}</span>
                            ) : (
                              <span className="muted">Nessuna variazione</span>
                            )}
                          </div>
                        </div>

                        {/* Visibilità Prevista */}
                        <div>
                          <strong className="muted">Visibilità:</strong>
                          <div style={{ marginTop: 4 }}>
                            {fcst.visib !== null && fcst.visib !== undefined ? (
                              <span>{formatVisibilityKm(fcst.visib).primary} ({formatVisibilityKm(fcst.visib).secondary})</span>
                            ) : (
                              <span className="muted">Nessuna variazione</span>
                            )}
                          </div>
                        </div>

                        {/* Nubi Previste */}
                        <div>
                          <strong className="muted">Nubi:</strong>
                          <div style={{ marginTop: 4 }}>
                            {hasClouds ? (
                              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {fcst.clouds.map((cloud, cIdx) => (
                                  <div key={cIdx} style={{ fontSize: "0.85rem" }}>
                                    {cloud.cover} {cloud.base !== null ? `a ${cloud.base} ft` : ""}
                                    {cloud.type ? ` (${cloud.type})` : ""}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="muted">Nessuna variazione</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
        </div>
      )}
    </AppShell>
  );
}
