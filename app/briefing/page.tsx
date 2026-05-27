import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  decodeWeatherString,
  resolveQueryToIcaos,
  getLocationWeatherDetails,
  findNearestIcao,
  getCoordinatesFromName,
  ITALIAN_AIRPORTS
} from "@/lib/weather";
import Link from "next/link";
import type { Route } from "next";

export default async function BriefingPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getSessionFromCookie();
  let user = null;
  if (session) {
    user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { settings: true }
    });
  }

  const { icao } = await searchParams;
  const defaultBase = user?.settings?.defaultBase || "LIML";
  const targetIcao = typeof icao === "string" ? icao.trim() : (session ? defaultBase : "");

  const showIntro = !targetIcao;

  let icaos: string[] = [];
  let stationsData: any[] = [];
  let validStations: any[] = [];
  let departureDetails = null;
  let arrivalDetails = null;

  if (!showIntro) {
    // Risolve i nomi delle località/aviosuperfici in codici ICAO reali
    icaos = await resolveQueryToIcaos(targetIcao, defaultBase);

    // Scarica i dati per ciascuna stazione della rotta, risolvendo la stazione più vicina se necessario
    stationsData = await Promise.all(
      icaos.map(async (icaoCode) => {
        const apt = ITALIAN_AIRPORTS[icaoCode];
        const [metar, taf] = await Promise.all([
          fetchMetar(icaoCode),
          fetchTaf(icaoCode)
        ]);

        if (metar || taf) {
          return {
            icao: icaoCode,
            name: apt?.name || metar?.name || taf?.name || "Aeroporto",
            metar,
            taf
          };
        }

        // Se non c'è METAR/TAF per questa stazione, cerchiamo le sue coordinate e la stazione più vicina
        let lat = apt?.lat;
        let lon = apt?.lon;
        let name = apt?.name || icaoCode;

        if (lat === undefined || lon === undefined) {
          const coords = await getCoordinatesFromName(icaoCode);
          if (coords) {
            lat = coords.lat;
            lon = coords.lon;
            name = coords.displayName || icaoCode;
          }
        }

        const searchLat = lat ?? 45.461; // default Milano Linate
        const searchLon = lon ?? 9.263;

        const nearestIcao = findNearestIcao(searchLat, searchLon, icaoCode);
        const [nearestMetar, nearestTaf] = await Promise.all([
          fetchMetar(nearestIcao),
          fetchTaf(nearestIcao)
        ]);

        return {
          icao: icaoCode,
          name,
          metar: null,
          taf: null,
          nearestReportingIcao: nearestIcao,
          nearestMetar,
          nearestTaf
        };
      })
    );

    // Consideriamo tutte le stazioni inserite come valide
    validStations = stationsData;

    // Estrai i token di partenza e arrivo inseriti dall'utente
    const tokens = targetIcao.split(/[,/\-➔➔]/).map(t => t.trim()).filter(Boolean);
    const departureName = tokens[0] || null;
    const arrivalName = tokens.length > 1 ? tokens[tokens.length - 1] : null;

    if (departureName) {
      const depIcao = icaos[0];
      const depStation = stationsData.find(s => s.icao === depIcao);
      const depQnh = depStation?.metar?.altim || depStation?.nearestMetar?.altim || 1013.25;
      departureDetails = await getLocationWeatherDetails(departureName, depQnh);
    }

    if (arrivalName) {
      const arrIcao = icaos[icaos.length - 1];
      const arrStation = stationsData.find(s => s.icao === arrIcao);
      const arrQnh = arrStation?.metar?.altim || arrStation?.nearestMetar?.altim || 1013.25;
      arrivalDetails = await getLocationWeatherDetails(arrivalName, arrQnh);
    }
  }

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

  return (
    <AppShell 
      title="Briefing Meteo" 
      subtitle="Dati aeronautici METAR e TAF lungo la rotta di volo."
    >
      {/* Cerca e Filtri Rapidi */}
      <div className="card no-print" style={{ marginBottom: 24, padding: "16px 20px" }}>
        <div className="between" style={{ gap: 16 }}>
          <form method="GET" action="/briefing" className="row" style={{ flex: 1, gap: 12 }}>
            <div className="field" style={{ flex: 1, minWidth: 200, gap: 0 }}>
              <input
                type="text"
                name="icao"
                defaultValue={targetIcao}
                placeholder="Codici ICAO separati da virgole (es. LIML, LIME, LIPZ)"
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
            <Link href={`/briefing?icao=${defaultBase}`} className={`pill ${targetIcao === defaultBase ? "active" : ""}`} style={{ cursor: "pointer", textDecoration: "none", backgroundColor: targetIcao === defaultBase ? "var(--primary)" : "var(--border)", color: targetIcao === defaultBase ? "white" : "var(--text)" }}>
              Base ({defaultBase})
            </Link>
            {defaultBase !== "LIML" && (
              <Link href="/briefing?icao=LIML" className={`pill ${targetIcao === "LIML" ? "active" : ""}`} style={{ cursor: "pointer", textDecoration: "none", backgroundColor: targetIcao === "LIML" ? "var(--primary)" : "var(--border)", color: targetIcao === "LIML" ? "white" : "var(--text)" }}>
                Linate (LIML)
              </Link>
            )}
            <Link href="/briefing?icao=LIME" className={`pill ${targetIcao === "LIME" ? "active" : ""}`} style={{ cursor: "pointer", textDecoration: "none", backgroundColor: targetIcao === "LIME" ? "var(--primary)" : "var(--border)", color: targetIcao === "LIME" ? "white" : "var(--text)" }}>
              Bergamo (LIME)
            </Link>
          </div>
        </div>
      </div>

      {/* Se non è stata inserita alcuna query di ricerca */}
      {showIntro ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px" }}>
          <span style={{ fontSize: "3rem" }}>🌤️</span>
          <h2 style={{ marginTop: 16 }}>Inserisci una località o rotta per iniziare</h2>
          <p className="muted" style={{ maxWidth: 500, margin: "8px auto 24px" }}>
            Digita un codice ICAO (es. <strong>LIML</strong>), il nome di un aeroporto/città (es. <strong>Bergamo</strong>, <strong>Valle Gaffaro</strong>) o una rotta composta (es. <strong>Dovera - Valle Gaffaro</strong>) nel campo di ricerca in alto.
          </p>
        </div>
      ) : validStations.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "48px 24px", borderColor: "var(--danger)" }}>
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <h2 style={{ marginTop: 16 }}>Nessun dato disponibile</h2>
          <p className="muted" style={{ maxWidth: 500, margin: "8px auto 24px" }}>
            Non siamo riusciti a recuperare i dati meteo per le stazioni richieste: <strong>{targetIcao}</strong>. 
            Verifica che i codici ICAO siano corretti o riprova più tardi.
          </p>
          <Link href={`/briefing?icao=${defaultBase}`} className="btn secondary">
            Torna al Campo Base ({defaultBase})
          </Link>
        </div>
      ) : (
        <div className="grid" style={{ gap: 24 }}>
          
          {/* SINTESI METEO DELLA ROTTA (Visualizzato solo se ci sono più aeroporti) */}
          {validStations.length > 1 && (
            <div className="card" style={{ 
              background: "linear-gradient(135deg, var(--card) 0%, rgba(246, 248, 251, 0.5) 100%)", 
              padding: 18,
              boxShadow: "0 10px 30px rgba(20, 32, 51, 0.05)"
            }}>
              <h3 style={{ margin: "0 0 12px 0", fontSize: "1.1rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                <span>🗺️</span> Sintesi Meteo della Rotta
              </h3>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                {validStations.map((data: any, idx: number) => {
                  const metarToUse = data.metar || data.nearestMetar;
                  const catStyle = metarToUse ? getFltCatStyle(metarToUse.fltCat) : null;
                  return (
                    <div key={data.icao} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      {idx > 0 && <span className="muted" style={{ fontSize: "1.2rem", fontWeight: "bold" }}>➔</span>}
                      <a href={`#station-${data.icao}`} style={{ 
                        display: "inline-flex", 
                        alignItems: "center", 
                        gap: 8, 
                        padding: "8px 12px", 
                        borderRadius: 12, 
                        border: catStyle ? catStyle.border : "1px solid var(--border)", 
                        backgroundColor: catStyle ? catStyle.bg : "var(--border)",
                        color: catStyle ? catStyle.color : "var(--muted)",
                        fontWeight: 700,
                        textDecoration: "none",
                        fontSize: "0.95rem"
                      }}>
                        <span>{data.icao}</span>
                        {metarToUse && <span style={{ fontSize: "0.8rem", opacity: 0.85 }}>({metarToUse.fltCat})</span>}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETTAGLI LOCALITA DI PARTENZA E DESTINAZIONE (Elevazione, OAT e Density Altitude esatti) */}
          {(departureDetails || arrivalDetails) && (
            <div style={{ marginBottom: 8 }}>
              <div className="grid grid-2 stack-mobile" style={{ gap: 24 }}>
                {/* PARTENZA */}
                {departureDetails && (
                  <div className="card" style={{ 
                    borderLeft: "4px solid var(--primary)",
                    background: "linear-gradient(135deg, var(--card) 0%, rgba(31, 111, 91, 0.02) 100%)",
                    padding: "20px 24px"
                  }}>
                    <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, color: "var(--primary-strong)" }}>
                      <span>🛫</span> {departureDetails.name.toUpperCase()}
                    </h3>
                    {departureDetails.resolvedAddress && (
                      <div className="muted" style={{ fontSize: "0.85rem", marginTop: -12, marginBottom: 16 }}>
                        📍 {departureDetails.resolvedAddress}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>Elevazione Reale:</span>
                        <strong style={{ fontSize: "1rem" }}>
                          {departureDetails.elevationM} m ({departureDetails.elevationFt} ft)
                        </strong>
                      </div>
                      <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>Temperatura (OAT) Reale:</span>
                        <strong style={{ fontSize: "1rem", color: "#b45309" }}>
                          {departureDetails.tempC}°C
                        </strong>
                      </div>
                      <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>QNH (Stazione meteo {departureDetails.nearestIcao}):</span>
                        <strong style={{ fontSize: "1rem" }}>
                          Q{departureDetails.qnhHpa} hPa
                        </strong>
                      </div>
                      <div className="between" style={{ paddingBottom: 4 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>Pressure Altitude (PA):</span>
                        <strong style={{ fontSize: "1rem" }}>
                          {departureDetails.pressureAltitudeFt.toLocaleString()} ft
                        </strong>
                      </div>
                      <div className="card" style={{ 
                        margin: "8px 0 0 0", 
                        padding: "12px 14px", 
                        backgroundColor: departureDetails.densityAltitudeFt > departureDetails.elevationFt + 2000 
                          ? "rgba(220, 38, 38, 0.05)" 
                          : "rgba(31, 111, 91, 0.05)",
                        border: departureDetails.densityAltitudeFt > departureDetails.elevationFt + 2000 
                          ? "1px solid rgba(220, 38, 38, 0.15)" 
                          : "1px solid rgba(31, 111, 91, 0.15)",
                        borderRadius: 10
                      }}>
                        <div className="between" style={{ alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: departureDetails.densityAltitudeFt > departureDetails.elevationFt + 2000 ? "#b91c1c" : "var(--primary-strong)" }}>
                            DENSITY ALTITUDE (DA):
                          </span>
                          <strong style={{ fontSize: "1.2rem", fontWeight: 900, color: departureDetails.densityAltitudeFt > departureDetails.elevationFt + 2000 ? "#dc2626" : "var(--primary)" }}>
                            {departureDetails.densityAltitudeFt.toLocaleString()} ft
                          </strong>
                        </div>
                        {departureDetails.densityAltitudeFt > departureDetails.elevationFt + 2000 && (
                          <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
                            ⚠️ Attenzione: DA elevata! Le prestazioni del motore e del velivolo (corsa di decollo, rateo di salita) sono ridotte.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* DESTINAZIONE */}
                {arrivalDetails && (
                  <div className="card" style={{ 
                    borderLeft: "4px solid #3b82f6",
                    background: "linear-gradient(135deg, var(--card) 0%, rgba(59, 130, 246, 0.02) 100%)",
                    padding: "20px 24px"
                  }}>
                    <h3 style={{ margin: "0 0 16px 0", fontSize: "1.15rem", fontWeight: 800, display: "flex", alignItems: "center", gap: 8, color: "#1d4ed8" }}>
                      <span>🛬</span> {arrivalDetails.name.toUpperCase()}
                    </h3>
                    {arrivalDetails.resolvedAddress && (
                      <div className="muted" style={{ fontSize: "0.85rem", marginTop: -12, marginBottom: 16 }}>
                        📍 {arrivalDetails.resolvedAddress}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>Elevazione Reale:</span>
                        <strong style={{ fontSize: "1rem" }}>
                          {arrivalDetails.elevationM} m ({arrivalDetails.elevationFt} ft)
                        </strong>
                      </div>
                      <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>Temperatura (OAT) Reale:</span>
                        <strong style={{ fontSize: "1rem", color: "#b45309" }}>
                          {arrivalDetails.tempC}°C
                        </strong>
                      </div>
                      <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>QNH (Stazione meteo {arrivalDetails.nearestIcao}):</span>
                        <strong style={{ fontSize: "1rem" }}>
                          Q{arrivalDetails.qnhHpa} hPa
                        </strong>
                      </div>
                      <div className="between" style={{ paddingBottom: 4 }}>
                        <span className="muted" style={{ fontSize: "0.9rem" }}>Pressure Altitude (PA):</span>
                        <strong style={{ fontSize: "1rem" }}>
                          {arrivalDetails.pressureAltitudeFt.toLocaleString()} ft
                        </strong>
                      </div>
                      <div className="card" style={{ 
                        margin: "8px 0 0 0", 
                        padding: "12px 14px", 
                        backgroundColor: arrivalDetails.densityAltitudeFt > arrivalDetails.elevationFt + 2000 
                          ? "rgba(220, 38, 38, 0.05)" 
                          : "rgba(59, 130, 246, 0.05)",
                        border: arrivalDetails.densityAltitudeFt > arrivalDetails.elevationFt + 2000 
                          ? "1px solid rgba(220, 38, 38, 0.15)" 
                          : "1px solid rgba(59, 130, 246, 0.15)",
                        borderRadius: 10
                      }}>
                        <div className="between" style={{ alignItems: "center" }}>
                          <span style={{ fontSize: "0.85rem", fontWeight: 700, color: arrivalDetails.densityAltitudeFt > arrivalDetails.elevationFt + 2000 ? "#b91c1c" : "#1d4ed8" }}>
                            DENSITY ALTITUDE (DA):
                          </span>
                          <strong style={{ fontSize: "1.2rem", fontWeight: 900, color: arrivalDetails.densityAltitudeFt > arrivalDetails.elevationFt + 2000 ? "#dc2626" : "#2563eb" }}>
                            {arrivalDetails.densityAltitudeFt.toLocaleString()} ft
                          </strong>
                        </div>
                        {arrivalDetails.densityAltitudeFt > arrivalDetails.elevationFt + 2000 && (
                          <div style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: 6, fontWeight: 600 }}>
                            ⚠️ Attenzione: DA elevata! La corsa di atterraggio sarà più lunga del normale a causa di una velocità all'aria vera (TAS) maggiore a parità di IAS.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PILA DEI METEO DI STAZIONE */}
          {validStations.map((station: any, sIdx: number) => {
            const isUsingNearest = !station.metar && !station.taf && !!station.nearestReportingIcao;
            const metar = isUsingNearest ? station.nearestMetar : station.metar;
            const taf = isUsingNearest ? station.nearestTaf : station.taf;
            const fltCatStyle = metar ? getFltCatStyle(metar.fltCat) : null;
            const humidity = metar ? getRelativeHumidity(metar.temp, metar.dewp) : 0;
            const tempSpread = metar ? getSpread(metar.temp, metar.dewp) : 0;

            return (
              <div 
                key={station.icao} 
                id={`station-${station.icao}`} 
                style={{ 
                  marginBottom: sIdx < validStations.length - 1 ? 48 : 0,
                  paddingTop: sIdx > 0 ? 32 : 0,
                  borderTop: sIdx > 0 ? "2px dashed var(--border)" : "none"
                }}
              >
                
                {/* INTESTAZIONE AEROPORTO */}
                <div className="card" style={{ 
                  background: "linear-gradient(135deg, var(--card) 0%, rgba(246, 248, 251, 0.4) 100%)",
                  borderLeft: `6px solid ${fltCatStyle?.color || "var(--border)"}`,
                  marginBottom: 20
                }}>
                  <div className="between" style={{ alignItems: "flex-start", gap: 16 }}>
                    <div>
                      <span className="muted" style={{ fontSize: "0.85rem", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em" }}>
                        Stazione {sIdx + 1} di {validStations.length}
                      </span>
                      <h2 style={{ margin: "4px 0 8px 0", fontSize: "1.6rem", fontWeight: 800 }}>
                        {station.icao} - {station.name || metar?.name || taf?.name || "Aeroporto"}
                      </h2>
                      {isUsingNearest && (
                        <div style={{ 
                          backgroundColor: "rgba(245, 158, 11, 0.08)", 
                          border: "1px solid rgba(245, 158, 11, 0.2)", 
                          color: "#d97706",
                          padding: "8px 12px",
                          borderRadius: 8,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          marginTop: 6,
                          marginBottom: 10,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6
                        }}>
                          ⚠️ Nessun bollettino meteo per {station.icao}. Vengono mostrati i dati della stazione più vicina: <strong>{station.nearestReportingIcao}</strong>
                        </div>
                      )}
                      <div className="row" style={{ gap: 16 }}>
                        {metar && (
                          <>
                            <span className="muted" style={{ fontSize: "0.9rem" }}>
                              📍 Elevazione{isUsingNearest ? ` (${station.nearestReportingIcao})` : ""}: <strong>{metar.elev !== undefined && metar.elev !== null ? `${metar.elev} m (~${Math.round(metar.elev * 3.28084)} ft)` : "N/D"}</strong>
                            </span>
                            <span className="muted" style={{ fontSize: "0.9rem" }}>
                              🕒 Rilevamento{isUsingNearest ? ` (${station.nearestReportingIcao})` : ""}: <strong>{formatReportTime(metar.reportTime)}</strong> ({getTimeAgo(metar.obsTime)})
                            </span>
                          </>
                        )}
                        {!metar && taf && (
                          <span className="muted" style={{ fontSize: "0.9rem" }}>
                            🕒 Bollettino TAF emesso il: <strong>{formatReportTime(taf.issueTime)}</strong>
                          </span>
                        )}
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
                        textAlign: "center"
                      }}>
                        {fltCatStyle.label}
                      </div>
                    )}
                  </div>
                </div>

                {/* METAR DETTAGLI DECODIFICATI */}
                {metar && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ marginBottom: 12, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>✈️</span> Condizioni Attuali ({metar.icaoId})
                    </h4>
                    
                    <div className="weather-grid">
                      
                      {/* VENTO */}
                      <div className="weather-card">
                        <div className="between">
                          <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>VENTO</span>
                          <span style={{ fontSize: "1.2rem" }}>💨</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 8 }}>
                          {!isNaN(Number(metar.wdir)) ? (
                            <div style={{ position: "relative", width: 50, height: 50, display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="50" height="50" viewBox="0 0 60 60">
                                <circle cx="30" cy="30" r="26" stroke="var(--border)" strokeWidth="2" fill="none" />
                                <text x="30" y="13" textAnchor="middle" fontSize="9" fontWeight="800" fill="var(--muted)">N</text>
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

                      {/* TEMPERATURA & UMIDITÀ */}
                      <div className="weather-card">
                        <div className="between">
                          <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>TEMP & UMIDITÀ</span>
                          <span style={{ fontSize: "1.2rem" }}>🌡️</span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                            {metar.temp !== undefined && metar.temp !== null ? `${metar.temp}°C` : "N/D"}
                          </div>
                          <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
                            Dewpoint: {metar.dewp !== undefined && metar.dewp !== null ? `${metar.dewp}°C` : "N/D"} · Spread: {tempSpread !== undefined && tempSpread !== null ? `${tempSpread}°C` : "N/D"}
                          </div>
                          <div className="muted" style={{ fontSize: "0.85rem", marginTop: 2 }}>
                            Umidità Relativa: <strong>{humidity}%</strong>
                          </div>
                        </div>
                      </div>

                      {/* VISIBILITÀ */}
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

                      {/* PRESSIONE (QNH) */}
                      <div className="weather-card">
                        <div className="between">
                          <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>PRESSIONE (QNH)</span>
                          <span style={{ fontSize: "1.2rem" }}>⏲️</span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                            {metar.altim ? `Q${metar.altim} hPa` : "N/D"}
                          </div>
                          <div className="muted" style={{ fontSize: "0.85rem", marginTop: 4 }}>
                            Standard: 1013 hPa
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* COPERTURA NUVOLOSA */}
                    <div className="card" style={{ marginBottom: 20 }}>
                      <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700, textTransform: "uppercase" }}>Copertura Nuvolosa</span>
                      <div style={{ marginTop: 12 }}>
                        {metar.cover === "CAVOK" ? (
                          <div className="row" style={{ gap: 8 }}>
                            <span style={{ color: "var(--primary)" }}>✓</span>
                            <span><strong>CAVOK</strong> - Cielo e visibilità OK. Nessuna nube sotto i 5000 ft o l'altezza minima di settore (MSA), nessun cumulonembo (CB) o cumulo congesto (TCU), e nessun fenomeno meteorologico significativo.</span>
                          </div>
                        ) : metar.clouds && metar.clouds.length > 0 ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {metar.clouds.map((cloud: any, i: number) => (
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

                    {/* METAR GREGGIO */}
                    <div className="card">
                      <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>METAR ORIGINALE (RAW)</span>
                      <div className="terminal-box" style={{ margin: "8px 0 0 0" }}>
                        {metar.rawOb}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAF DETTAGLI DECODIFICATI */}
                {taf && (
                  <div>
                    <h4 style={{ marginBottom: 12, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: 8 }}>
                      <span>📅</span> Previsioni di Aeroporto (TAF {taf.icaoId})
                    </h4>
                    
                    <div className="card" style={{ marginBottom: 20 }}>
                      <span className="muted" style={{ fontSize: "0.85rem", fontWeight: 700 }}>TAF ORIGINALE (RAW)</span>
                      <div className="terminal-box" style={{ margin: "8px 0 0 0", color: "#10b981" }}>
                        {taf.rawTAF}
                      </div>
                    </div>

                    <div className="timeline-container">
                      {(taf.fcsts || []).map((fcst: any, idx: number) => {
                        const hasClouds = fcst.clouds && fcst.clouds.length > 0;
                        const changeLabel = formatChangeIndicator(fcst.fcstChange, fcst.probability);
                        
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
                          <div key={idx} className="timeline-item" style={{ border: itemBorder, background: itemBg }}>
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
                              {/* Vento */}
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

                              {/* Visibilità */}
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

                              {/* Nubi */}
                              <div>
                                <strong className="muted">Nubi:</strong>
                                <div style={{ marginTop: 4 }}>
                                  {hasClouds ? (
                                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                      {fcst.clouds.map((cloud: any, cIdx: number) => (
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
            );
          })}
          
        </div>
      )}
    </AppShell>
  );
}
