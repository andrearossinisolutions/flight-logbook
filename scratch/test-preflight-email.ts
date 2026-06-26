import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import nodemailer from "nodemailer";
import {
  eur,
  formatDateDisplay,
  formatTimeDisplay,
  minutesToHoursMinutes,
  hasTime
} from "../lib/utils";
import {
  fetchMetar,
  fetchTaf,
  getFltCatStyle,
  resolveQueryToIcaos,
  ITALIAN_AIRPORTS,
  getRelativeHumidity,
  getSpread,
  formatWind,
  formatVisibilityKm,
  decodeWeatherString
} from "../lib/weather";

type FlightMovement = any;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function flightType(flight: any) {
  if (!flight) return "Volo";
  const isPartnership = !!flight.partnershipAircraftId;
  if (flight.instructorMinutes === flight.durationMinutes) return "Lezione";
  if (flight.instructorMinutes > 0 && flight.instructorMinutes < flight.durationMinutes) {
    return isPartnership ? "Volo Società con lezione" : "Noleggio con lezione";
  }
  return isPartnership ? "Volo Società" : "Noleggio";
}

// --- buildPreFlightWeatherEmail logic ---
function buildPreFlightWeatherEmail(args: {
  flight: FlightMovement;
  stationsWeather: any[];
}) {
  const { flight, stationsWeather } = args;

  const takeoff = flight.flight?.takeoffPlace || "?";
  const arrival = flight.flight?.arrivalPlace || "?";
  const routeStr = `${takeoff} ➔ ${arrival}`;
  const subject = `[TEST SIMULAZIONE] Flight Logbook · Briefing Meteo Pre-Volo (${routeStr})`;

  const flightTimeStr = flight.date.toLocaleString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Rome"
  }) + " (Locali)";

  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const routeParam = [flight.flight?.takeoffPlace, flight.flight?.arrivalPlace].filter(Boolean).join(" - ") || flight.notes || "";
  const briefingUrl = `${appUrl}/briefing?icao=${encodeURIComponent(routeParam)}&date=${encodeURIComponent(flight.date.toISOString())}`;

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

  const textParts = [
    `Briefing Meteo Pre-Volo - Flight Logbook [TEST]`,
    `Volo: ${flightType(flight.flight)} su ${flight.flight?.aircraftRegistration ?? "I-4150"} (${flight.flight?.aircraftType ?? "P92"})`,
    `Tratta: ${routeStr}`,
    `Orario di partenza: ${flightTimeStr}`,
    `Link Briefing Completo: ${briefingUrl}`,
    `\n--- BOLLETTINI METEO ---`
  ];

  for (const sw of stationsWeather) {
    textParts.push(`\nStazione: ${sw.icao} - ${sw.name}`);
    if (sw.metar) {
      textParts.push(`  METAR Categoria: ${sw.metar.fltCat}`);
      textParts.push(`  Raw METAR: ${sw.metar.rawOb}`);
      textParts.push(`  Temp: ${sw.metar.temp}°C / Dewpoint: ${sw.metar.dewp}°C`);
      textParts.push(`  Vento: ${sw.metar.wdir}° @ ${sw.metar.wspd} kt`);
    } else {
      textParts.push(`  Nessun dato METAR attuale.`);
    }

    if (sw.taf) {
      textParts.push(`  Raw TAF: ${sw.taf.rawTAF}`);
      for (const fcst of sw.taf.fcsts || []) {
        const changeLabel = formatChangeIndicator(fcst.fcstChange, fcst.probability);
        const wStr = fcst.wdir !== null && fcst.wspd !== null ? formatWind(fcst.wdir, fcst.wspd, fcst.wgst) : "Nessuna variazione";
        const vStr = fcst.visib !== null && fcst.visib !== undefined ? `${formatVisibilityKm(fcst.visib).primary}` : "Nessuna variazione";
        textParts.push(`    Periodo: ${changeLabel} (${formatTafTime(fcst.timeFrom)} - ${formatTafTime(fcst.timeTo)})`);
        textParts.push(`      Vento: ${wStr} | Visibilità: ${vStr}`);
        if (fcst.wxString) {
          textParts.push(`      Meteo: ${decodeWeatherString(fcst.wxString)}`);
        }
      }
    } else {
      textParts.push(`  Nessun bollettino TAF attuale.`);
    }
  }

  const text = textParts.join("\n");

  const stationsSummaryHtml = stationsWeather
    .map((sw) => {
      const fltCatStyle = sw.metar ? getFltCatStyle(sw.metar.fltCat) : null;
      const catLabel = fltCatStyle ? fltCatStyle.label : "DATO N/D";
      const catColor = fltCatStyle ? fltCatStyle.color : "#64748b";
      const catBg = fltCatStyle ? fltCatStyle.bg : "#f1f5f9";
      const catBorder = fltCatStyle ? fltCatStyle.border : "1px solid #e2e8f0";

      return `
        <div style="display: inline-flex; align-items: center; gap: 8px; margin-right: 16px; margin-bottom: 8px; padding: 6px 12px; border-radius: 8px; background-color: ${catBg}; border: ${catBorder}; color: ${catColor}; font-weight: 700; font-size: 13px;">
          <span>${sw.icao}</span>
          <span style="font-size: 11px; opacity: 0.85;">(${catLabel})</span>
        </div>
      `;
    })
    .join("");

  const stationsDetailsHtml = stationsWeather
    .map((sw) => {
      const fltCatStyle = sw.metar ? getFltCatStyle(sw.metar.fltCat) : null;
      const catBadge = fltCatStyle 
        ? `<span style="display: inline-block; padding: 3px 8px; font-size: 11px; font-weight: 700; border-radius: 6px; background-color: ${fltCatStyle.bg}; border: ${fltCatStyle.border}; color: ${fltCatStyle.color};">${fltCatStyle.label}</span>`
        : "";

      let metarHtml = "";
      if (sw.metar) {
        const humidity = getRelativeHumidity(sw.metar.temp, sw.metar.dewp);
        const spread = getSpread(sw.metar.temp, sw.metar.dewp);
        metarHtml = `
          <div style="margin-top: 8px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 4px;">Condizioni Attuali (METAR) ${catBadge}</div>
            <div style="font-family: monospace; font-size: 12px; background: #0f172a; color: #38bdf8; padding: 8px; border-radius: 6px; margin-bottom: 8px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">
              ${sw.metar.rawOb}
            </div>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px; font-size: 13px;">
              <div><strong>Temperatura:</strong> ${sw.metar.temp}°C</div>
              <div><strong>Dewpoint:</strong> ${sw.metar.dewp}°C (Spread: ${spread}°C)</div>
              <div><strong>Umidità Relativa:</strong> ${humidity}%</div>
              <div><strong>Vento:</strong> ${sw.metar.wdir}° a ${sw.metar.wspd} kt</div>
            </div>
          </div>
        `;
      } else {
        metarHtml = `
          <div style="margin-top: 8px; padding: 12px; background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; color: #991b1b; font-size: 13px;">
            ⚠️ Nessun dato METAR disponibile al momento per questa stazione.
          </div>
        `;
      }

      let tafHtml = "";
      if (sw.taf) {
        const fcstsHtml = (sw.taf.fcsts || [])
          .map((fcst: any) => {
            const hasClouds = fcst.clouds && fcst.clouds.length > 0;
            const changeLabel = formatChangeIndicator(fcst.fcstChange, fcst.probability);
            
            let itemBg = "#ffffff";
            let itemBorder = "1px solid #e2e8f0";
            let itemHeaderColor = "#1e293b";
            
            if (fcst.fcstChange === "TEMPO") {
              itemBg = "rgba(245, 158, 11, 0.02)";
              itemBorder = "1px solid rgba(245, 158, 11, 0.15)";
              itemHeaderColor = "#b45309";
            } else if (fcst.fcstChange === "BECMG") {
              itemBg = "rgba(37, 99, 235, 0.02)";
              itemBorder = "1px solid rgba(37, 99, 235, 0.15)";
              itemHeaderColor = "#1d4ed8";
            } else if (!fcst.fcstChange) {
              itemBg = "rgba(31, 111, 91, 0.02)";
              itemBorder = "1px solid rgba(31, 111, 91, 0.15)";
              itemHeaderColor = "#1f6f5b";
            }

            const weatherBadge = fcst.wxString 
              ? `<span style="display: inline-block; padding: 2px 6px; font-size: 11px; font-weight: 700; border-radius: 4px; background-color: #fee2e2; color: #b91c1c; margin-left: 8px;">⚠️ ${decodeWeatherString(fcst.wxString)}</span>`
              : "";

            const windStr = fcst.wdir !== null && fcst.wspd !== null
              ? formatWind(fcst.wdir, fcst.wspd, fcst.wgst)
              : '<span style="color: #94a3b8;">Nessuna variazione</span>';

            const visStr = fcst.visib !== null && fcst.visib !== undefined
              ? `${formatVisibilityKm(fcst.visib).primary} (${formatVisibilityKm(fcst.visib).secondary})`
              : '<span style="color: #94a3b8;">Nessuna variazione</span>';

            const cloudsStr = hasClouds
              ? fcst.clouds.map((cloud: any) => `${cloud.cover} ${cloud.base !== null ? `a ${cloud.base} ft` : ""}${cloud.type ? ` (${cloud.type})` : ""}`).join("<br />")
              : '<span style="color: #94a3b8;">Nessuna variazione</span>';

            return `
              <div style="margin-top: 10px; padding: 12px; border: ${itemBorder}; background-color: ${itemBg}; border-radius: 8px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 4px;">
                  <strong style="color: ${itemHeaderColor}; text-transform: uppercase; font-size: 11px; letter-spacing: 0.03em;">${changeLabel}</strong>
                  <span style="font-size: 12px; font-weight: 700; color: #475569;">⏱️ ${formatTafTime(fcst.timeFrom)} - ${formatTafTime(fcst.timeTo)}</span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; font-size: 12px; border-top: 1px solid #f1f5f9; padding-top: 8px; margin-top: 4px;">
                  <div><strong>Vento:</strong><br />${windStr}</div>
                  <div><strong>Visibilità:</strong><br />${visStr} ${weatherBadge}</div>
                  <div><strong>Nubi:</strong><br />${cloudsStr}</div>
                </div>
              </div>
            `;
          })
          .join("");

        tafHtml = `
          <div style="margin-top: 8px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
            <div style="font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 4px;">Previsioni Terminali (TAF)</div>
            <div style="font-family: monospace; font-size: 12px; background: #0f172a; color: #34d399; padding: 8px; border-radius: 6px; overflow-x: auto; white-space: pre-wrap; word-break: break-all;">
              ${sw.taf.rawTAF}
            </div>
            <div style="margin-top: 8px;">
              ${fcstsHtml}
            </div>
          </div>
        `;
      } else {
        tafHtml = `
          <div style="margin-top: 8px; padding: 12px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; font-size: 13px;">
            Nessun bollettino TAF disponibile per questa stazione.
          </div>
        `;
      }

      return `
        <div style="margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px dashed #e2e8f0;">
          <div style="font-size: 16px; font-weight: 800; color: #17324d; margin-bottom: 6px;">
            ✈️ ${sw.icao} - ${sw.name}
          </div>
          ${metarHtml}
          ${tafHtml}
        </div>
      `;
    })
    .join("");

  const html = `
    <div style="margin: 0; padding: 24px 16px; background-color: #edf3f8; font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #17324d;">
      <div style="max-width: 680px; margin: 0 auto;">
        
        <!-- Header Volo -->
        <div style="margin: 0 0 20px; padding: 20px; border-radius: 20px; background: linear-gradient(135deg, #17324d 0%, #244a70 100%); color: #ffffff;">
          <div style="font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.8; margin-bottom: 4px;">
            Briefing Meteo Pre-Volo (1 Ora alla Partenza) [TEST SIMULAZIONE]
          </div>
          <div style="font-size: 24px; font-weight: 800; margin-bottom: 8px;">
            ${routeStr}
          </div>
          <div style="font-size: 14px; opacity: 0.9;">
            Decollo previsto: <strong>${flightTimeStr}</strong>
          </div>
          <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">
            Aeromobile: <strong>${flight.flight?.aircraftRegistration ?? "I-4150"} (${flight.flight?.aircraftType ?? "P92"})</strong>
          </div>
        </div>

        <!-- Card Principale Dettagli -->
        <div style="background: #ffffff; border: 1px solid #dbe5f0; border-radius: 20px; padding: 20px; box-shadow: 0 6px 15px rgba(20, 32, 51, 0.03);">
          
          <div style="font-size: 14px; color: #4c5f76; margin-bottom: 16px; line-height: 1.5;">
            Di seguito trovi i bollettini METAR e TAF più recenti per la tratta del tuo volo odierno.
          </div>

          <!-- Categorie di Volo delle Stazioni -->
          <div style="margin-bottom: 20px;">
            ${stationsSummaryHtml}
          </div>

          <!-- Dettagli per Singola Stazione -->
          <div>
            ${stationsDetailsHtml}
          </div>

          <!-- Call To Action Briefing Completo -->
          <div style="margin-top: 24px; text-align: center;">
            <a href="${briefingUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; font-size: 15px; font-weight: 700; text-decoration: none; border-radius: 10px; border: 1px solid #15803d; box-shadow: 0 4px 10px rgba(22, 163, 74, 0.15);">
              🌤️ Apri Briefing Completo
            </a>
            <div style="font-size: 12px; color: #64748b; margin-top: 8px;">
              Accedi alla mappa interattiva Ventusky e alle carte aeronautiche SWLL complete.
            </div>
          </div>

        </div>

      </div>
    </div>
  `;

  return { subject, text, html };
}

async function main() {
  console.log("Starting pre-flight test script...");

  // Dynamically import prisma to prevent ES6 module import hoisting from executing before loadEnvConfig
  const { prisma } = await import("../lib/prisma");

  // 1. Find user (prioritize Rossini/Solutions, fallback to any non-example)
  const allUsers = await prisma.user.findMany({
    include: { settings: true }
  });
  let user = allUsers.find(u => u.email.includes("rossini") || u.email.includes("solutions"));
  if (!user) {
    user = allUsers.find(u => u.email !== "demo@example.com");
  }
  if (!user) {
    user = allUsers[0];
  }

  if (!user) {
    console.error("No user found in dev.db.");
    return;
  }

  console.log(`Chosen recipient user: ${user.fullName} (${user.email})`);

  // 2. Create mock flight "Dovera -> Valle Gaffaro" departing in 1 hour (60 mins)
  const mockDate = new Date(Date.now() + 60 * 60 * 1000);
  console.log(`Creating mock flight departing at ${mockDate.toISOString()}...`);

  const flight = await prisma.movement.create({
    data: {
      userId: user.id,
      type: "FLIGHT",
      date: mockDate,
      amount: 0,
      notes: "Volo pre-volo Dovera -> Valle Gaffaro (Simulazione)",
      isDraft: true,
      flight: {
        create: {
          aircraftRegistration: "I-4150",
          aircraftType: "P92",
          inputMode: "MANUAL",
          durationMinutes: 95,
          instructorMinutes: 0,
          takeoffPlace: "Dovera",
          arrivalPlace: "Valle Gaffaro",
          rentalRateApplied: 0,
          instructorRateApplied: 0,
          rentalCost: 0,
          instructorCost: 0,
          totalCost: 0
        }
      }
    },
    include: {
      flight: true
    }
  });

  console.log(`Created flight movement ID: ${flight.id}`);

  // 3. Resolve route, fetch weather and build email
  const defaultBase = user.settings?.defaultBase || "LIML";
  const routeQuery = "Dovera - Valle Gaffaro";

  console.log(`Resolving ICAO stations for route: "${routeQuery}"...`);
  const icaos = await resolveQueryToIcaos(routeQuery, defaultBase);
  console.log(`Resolved ICAO stations: ${icaos.join(", ")}`);

  console.log("Fetching METAR and TAF data...");
  const stationsWeather = await Promise.all(
    icaos.map(async (icaoCode) => {
      const apt = ITALIAN_AIRPORTS[icaoCode];
      const [metar, taf] = await Promise.all([
        fetchMetar(icaoCode),
        fetchTaf(icaoCode),
      ]);
      return {
        icao: icaoCode,
        name: apt?.name || metar?.name || taf?.name || "Aeroporto",
        metar,
        taf,
      };
    })
  );

  const email = buildPreFlightWeatherEmail({
    flight,
    stationsWeather,
  });

  // 4. Send Email via SMTP
  const SMTP_HOST = "smtp.ionos.it";
  const SMTP_PORT = 587;
  const SMTP_SECURE = false;

  const authUser = process.env.SMTP_AUTH_USERNAME;
  const authPassword = process.env.SMTP_AUTH_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || "Flight Logbook";

  if (!authUser || !authPassword || !fromEmail) {
    console.error("SMTP environment variables are not configured properly in .env.");
    // Cleanup flight before exiting
    await prisma.movement.delete({ where: { id: flight.id } });
    return;
  }

  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: authUser,
      pass: authPassword,
    },
  });

  console.log(`Sending pre-flight email to ${user.email}...`);
  const info = await transporter.sendMail({
    from: {
      name: fromName,
      address: fromEmail,
    },
    to: user.email,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });

  console.log("Pre-flight email sent successfully!", info.messageId);

  // 5. Cleanup mock data
  console.log("Cleaning up mock flight from database...");
  await prisma.movement.delete({
    where: { id: flight.id }
  });
  console.log("Cleanup complete!");
}

main().catch(async (err) => {
  console.error("Error in test script:", err);
});
