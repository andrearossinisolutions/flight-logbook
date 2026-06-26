import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import nodemailer from "nodemailer";
import {
  eur,
  formatDateDisplay,
  formatTimeDisplay,
  minutesToHoursMinutes,
  hasTime,
} from "../lib/utils";

// --- copied types from daily-jobs.ts ---
type FlightMovement = any;
type PaymentMovement = any;
type ReminderMovement = any;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function flightType(flight: FlightMovement["flight"]) {
  if (!flight) {
    return "Volo";
  }
  const isPartnership = !!flight.partnershipAircraftId;

  if (flight.instructorMinutes === flight.durationMinutes) {
    return "Lezione";
  }

  if (flight.instructorMinutes > 0 && flight.instructorMinutes < flight.durationMinutes) {
    return isPartnership ? "Volo Società con lezione" : "Noleggio con lezione";
  }

  return isPartnership ? "Volo Società" : "Noleggio";
}

function paymentTypeLabel(item: PaymentMovement) {
  if (item.type === "SERVICE") {
    return "Pagamento servizio";
  }

  if (Number(item.amount) < 0) {
    return "Addebito / correzione saldo";
  }

  return "Ricarica credito";
}

function buildDailyDigestEmail(args: {
  tomorrowFlights: FlightMovement[];
  duePayments: PaymentMovement[];
  todayReminders: ReminderMovement[];
}) {
  const { tomorrowFlights, duePayments, todayReminders } = args;
  const totalPaymentsAmount = duePayments.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);

  const subjectParts = [];
  if (todayReminders.length > 0) {
    subjectParts.push(
      todayReminders.length === 1
        ? "1 promemoria oggi"
        : `${todayReminders.length} promemoria oggi`
    );
  }
  if (tomorrowFlights.length > 0) {
    subjectParts.push(
      tomorrowFlights.length === 1
        ? "1 volo pianificato domani"
        : `${tomorrowFlights.length} voli pianificati domani`,
    );
  }
  if (duePayments.length > 0) {
    subjectParts.push(
      duePayments.length === 1
        ? "1 pagamento in scadenza oggi"
        : `${duePayments.length} pagamenti in scadenza oggi`,
    );
  }

  const subject = `Flight Logbook · ${subjectParts.join(" · ")}`;

  const reminderText = todayReminders.length > 0
    ? [
        "Promemoria di oggi:",
        ...todayReminders.map((item, index) => {
          const isTimed = hasTime(item.date);
          const timeStr = isTimed ? ` alle ${formatTimeDisplay(item.date)}` : "";
          return `${index + 1}. Promemoria${timeStr}: ${item.notes}`;
        }),
      ].join("\n")
    : null;

  const flightText = tomorrowFlights.length > 0
    ? [
        "Voli pianificati per domani:",
        ...tomorrowFlights.map((item, index) => {
          const route = item.flight?.takeoffPlace || item.flight?.arrivalPlace
            ? ` · ${item.flight?.takeoffPlace ?? "?"} -> ${item.flight?.arrivalPlace ?? "?"}`
            : "";

          const notes = item.notes ? `\n  Note: ${item.notes}` : "";

          const appUrl = process.env.APP_URL || "http://localhost:3000";
          const routeParam = [item.flight?.takeoffPlace, item.flight?.arrivalPlace].filter(Boolean).join(" - ") || item.notes || "";
          const briefingUrl = `${appUrl}/briefing?icao=${encodeURIComponent(routeParam)}&date=${encodeURIComponent(item.date.toISOString())}`;
          const briefingLinkText = `\n  Briefing Meteo: ${briefingUrl}`;

          return `${index + 1}. ${formatDateDisplay(item.date)} ${formatTimeDisplay(item.date)} · ${flightType(item.flight)} · ` +
            `${item.flight?.aircraftRegistration ?? "I-4150"} (${item.flight?.aircraftType ?? "P92"}) · ` +
            `${minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}${route}${notes}${briefingLinkText}`;
        }),
      ].join("\n")
    : null;

  const paymentText = duePayments.length > 0
    ? [
        "Pagamenti in scadenza oggi:",
        ...duePayments.map((item, index) => {
          const notes = item.notes ? `\n  Note: ${item.notes}` : "";

          return `${index + 1}. ${paymentTypeLabel(item)} · ${eur(Number(item.amount))}${notes}`;
        }),
      ].join("\n")
    : null;

  const text = [
    "Promemoria giornaliero Flight Logbook",
    reminderText,
    flightText,
    paymentText,
  ]
    .filter(Boolean)
    .join("\n\n");

  const summaryHtml = `
    <div style="margin: 0 0 24px; padding: 22px; border-radius: 24px; background: linear-gradient(135deg, #17324d 0%, #244a70 100%); color: #ffffff;">
      <div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.78; margin-bottom: 10px;">
        Promemoria giornaliero
      </div>
      <div style="font-size: 30px; line-height: 1.1; font-weight: 800; margin-bottom: 10px;">
        Flight Logbook
      </div>
      <div style="font-size: 15px; line-height: 1.6; opacity: 0.92;">
        ${todayReminders.length > 0 ? `Hai <strong>${todayReminders.length}</strong> ${todayReminders.length === 1 ? "promemoria per oggi" : "promemoria per oggi"}` : ""}
        ${todayReminders.length > 0 && (tomorrowFlights.length > 0 || duePayments.length > 0) ? "<br />" : ""}
        ${tomorrowFlights.length > 0 ? `Hai <strong>${tomorrowFlights.length}</strong> ${tomorrowFlights.length === 1 ? "volo pianificato per domani" : "voli pianificati per domani"}` : "Nessun volo pianificato per domani"}
        ${(tomorrowFlights.length > 0 || todayReminders.length > 0) && duePayments.length > 0 ? "<br />" : ""}
        ${duePayments.length > 0 ? `Hai <strong>${duePayments.length}</strong> ${duePayments.length === 1 ? "pagamento in scadenza oggi" : "pagamenti in scadenza oggi"}` : ""}
      </div>
    </div>
  `;

  const remindersHtml = todayReminders.length > 0
    ? `
      <div style="margin: 0 0 28px;">
        <div style="font-size: 20px; font-weight: 800; color: #0284c7; margin: 0 0 14px;">Promemoria di oggi</div>
        ${todayReminders
          .map((item) => {
            const isTimed = hasTime(item.date);
            const timeStr = isTimed ? ` alle ${formatTimeDisplay(item.date)}` : "";

            return `
              <div style="margin: 0 0 14px; padding: 18px; border: 1px solid #bae6fd; border-radius: 20px; background: #f0f9ff;">
                <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
                  <div>
                    <div style="font-size: 17px; font-weight: 800; color: #0369a1; margin-bottom: 6px;">
                      🔔 Promemoria${escapeHtml(timeStr)}
                    </div>
                    <div style="font-size: 14px; line-height: 1.5; color: #0f172a;">
                      ${escapeHtml(item.notes ?? "")}
                    </div>
                  </div>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const flightHtml = tomorrowFlights.length > 0
    ? `
      <div style="margin: 0 0 28px;">
        <div style="font-size: 20px; font-weight: 800; color: #17324d; margin: 0 0 14px;">Voli pianificati per domani</div>
        ${tomorrowFlights
          .map((item) => {
            const route = item.flight?.takeoffPlace || item.flight?.arrivalPlace
              ? `
                <div style="margin-top: 10px; font-size: 14px; color: #17324d;">
                  <span style="font-weight: 700;">Tratta:</span>
                  🛫 ${escapeHtml(item.flight?.takeoffPlace ?? "?")} <span style="opacity: 0.6;"> · </span> 🛬 ${escapeHtml(item.flight?.arrivalPlace ?? "?")}
                </div>
              `
              : "";

            const notes = item.notes
              ? `
                <div style="margin-top: 10px; font-size: 14px; line-height: 1.5; color: #4c5f76;">
                  <span style="font-weight: 700; color: #17324d;">Note:</span> ${escapeHtml(item.notes)}
                </div>
              `
              : "";

            const appUrl = process.env.APP_URL || "http://localhost:3000";
            const routeParam = [item.flight?.takeoffPlace, item.flight?.arrivalPlace].filter(Boolean).join(" - ") || item.notes || "";
            const briefingUrl = `${appUrl}/briefing?icao=${encodeURIComponent(routeParam)}&date=${encodeURIComponent(item.date.toISOString())}`;

            return `
              <div style="margin: 0 0 14px; padding: 18px; border: 1px solid #dbe5f0; border-radius: 20px; background: #ffffff;">
                <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
                  <div>
                    <div style="font-size: 17px; font-weight: 800; color: #17324d; margin-bottom: 6px;">
                      ${escapeHtml(flightType(item.flight))}
                    </div>
                    <div style="font-size: 14px; color: #4c5f76;">
                      ${escapeHtml(item.flight?.aircraftRegistration ?? "I-4150")} (${escapeHtml(item.flight?.aircraftType ?? "P92")})
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 13px; color: #5b718c;">Durata prevista</div>
                    <div style="font-size: 18px; font-weight: 800; color: #17324d;">
                      ${escapeHtml(minutesToHoursMinutes(item.flight?.durationMinutes ?? 0))}
                    </div>
                  </div>
                </div>

                <div style="margin-top: 14px; font-size: 14px; color: #17324d;">
                  <span style="display: inline-block; margin-right: 14px;">📅 ${escapeHtml(formatDateDisplay(item.date))}</span>
                  <span style="display: inline-block;">🕒 ${escapeHtml(formatTimeDisplay(item.date))}</span>
                </div>

                ${route}
                ${notes}

                <div style="margin-top: 16px;">
                  <a href="${briefingUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 8px 16px; font-size: 13px; font-weight: 700; text-decoration: none; border-radius: 8px; border: 1px solid #15803d;">
                    🌤️ Briefing Meteo
                  </a>
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const paymentsHtml = duePayments.length > 0
    ? `
      <div style="margin: 0;">
        <div style="font-size: 20px; font-weight: 800; color: #17324d; margin: 0 0 14px;">Pagamenti in scadenza oggi</div>
        ${duePayments
          .map((item) => {
            const notes = item.notes
              ? `
                <div style="margin-top: 10px; font-size: 14px; line-height: 1.5; color: #6b5a4b;">
                  <span style="font-weight: 700; color: #7f3f1d;">Note:</span> ${escapeHtml(item.notes)}
                </div>
              `
              : "";

            return `
              <div style="margin: 0 0 14px; padding: 18px; border: 1px solid #f1d7c8; border-radius: 20px; background: #fffdfb;">
                <div style="display: flex; justify-content: space-between; gap: 12px; align-items: flex-start;">
                  <div>
                    <div style="font-size: 17px; font-weight: 800; color: #7f3f1d; margin-bottom: 6px;">
                      ${escapeHtml(paymentTypeLabel(item))}
                    </div>
                    <div style="font-size: 14px; color: #8b5c3d;">
                      📅 ${escapeHtml(formatDateDisplay(item.date))}
                    </div>
                  </div>
                  <div style="text-align: right;">
                    <div style="font-size: 13px; color: #8b5c3d;">Importo</div>
                    <div style="font-size: 18px; font-weight: 800; color: #7f3f1d;">
                      ${escapeHtml(eur(Number(item.amount)))}
                    </div>
                  </div>
                </div>

                ${notes}
              </div>
            `;
          })
          .join("")}
      </div>
    `
    : "";

  const html = `
    <div style="margin: 0; padding: 32px 16px; background: #edf3f8; font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #17324d;">
      <div style="max-width: 760px; margin: 0 auto;">
        ${summaryHtml}

        <div style="background: #ffffff; border: 1px solid #dbe5f0; border-radius: 28px; padding: 24px;">
          <div style="font-size: 15px; line-height: 1.7; color: #4c5f76; margin-bottom: 24px;">
            Questo riepilogo è stato generato automaticamente da <strong style="color: #17324d;">Flight Logbook</strong>
            per aiutarti a tenere sotto controllo pianificazioni e scadenze della giornata.
          </div>

          ${remindersHtml}
          ${flightHtml}
          ${paymentsHtml}
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

async function main() {
  console.log("Starting test email send...");

  // Dynamically import prisma to prevent ES6 module import hoisting from executing before loadEnvConfig
  const { prisma } = await import("../lib/prisma");

  const allUsers = await prisma.user.findMany();
  console.log("Found users in database:");
  allUsers.forEach(u => console.log(`- ${u.id}: ${u.fullName} (${u.email})`));

  // Let's search for an email with rossini, solutions, or a real-looking email
  let user = allUsers.find(u => u.email.includes("rossini") || u.email.includes("solutions"));
  if (!user) {
    // any user not matching demo@example.com
    user = allUsers.find(u => u.email !== "demo@example.com");
  }
  if (!user) {
    user = allUsers[0];
  }

  if (!user) {
    console.error("No user found in dev.db at all!");
    return;
  }
  
  const recipient = user.email;
  console.log(`Chosen recipient user: ${user.fullName || "User"} (${recipient})`);
  
  // Create a mock flight movement for tomorrow
  const mockFlight: any = {
    id: "test-flight-id",
    userId: user.id,
    type: "FLIGHT",
    date: new Date(Date.now() + 24 * 3600000), // tomorrow
    amount: 0,
    notes: "Pianificazione rotta e briefing meteo VFR",
    isDraft: true,
    flight: {
      aircraftRegistration: "I-4150",
      aircraftType: "P92",
      durationMinutes: 95,
      takeoffPlace: "LIML",
      arrivalPlace: "LIME",
      instructorMinutes: 0
    }
  };

  const email = buildDailyDigestEmail({
    tomorrowFlights: [mockFlight],
    duePayments: [],
    todayReminders: []
  });

  const SMTP_HOST = "smtp.ionos.it";
  const SMTP_PORT = 587;
  const SMTP_SECURE = false;

  const authUser = process.env.SMTP_AUTH_USERNAME;
  const authPassword = process.env.SMTP_AUTH_PASSWORD;
  const fromEmail = process.env.SMTP_FROM_EMAIL;
  const fromName = process.env.SMTP_FROM_NAME || "Flight Logbook";

  if (!authUser || !authPassword || !fromEmail) {
    console.error("SMTP environment variables are not configured properly in .env.");
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

  console.log("Sending daily digest test email...");
  const info = await transporter.sendMail({
    from: {
      name: fromName,
      address: fromEmail,
    },
    to: recipient,
    subject: `[TEST] ${email.subject}`,
    html: email.html,
    text: email.text,
  });

  console.log("Email sent successfully!", info.messageId);
}

main().catch(err => {
  console.error("Error sending test email:", err);
});
