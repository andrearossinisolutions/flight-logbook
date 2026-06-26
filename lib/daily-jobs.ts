import { MovementType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendUserEmail } from "@/lib/mail";
import {
  eur,
  formatDateDisplay,
  formatTimeDisplay,
  minutesToHoursMinutes,
  getRomeDateTimeParts,
  romeLocalDateTimeToUtcDate,
  hasTime,
} from "@/lib/utils";
import { buildMonthlyReportEmail } from "@/lib/monthly-report-email";
import { getMonthlyMaintenanceShares } from "@/lib/maintenance";
import { calculateHistoricalReports } from "@/lib/reports";
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
  decodeWeatherString,
} from "@/lib/weather";




const ONE_MINUTE_MS = 60 * 1000;
const DAILY_RUN_HOUR = 9;
const ROME_TIME_ZONE = "Europe/Rome";
const DAILY_DIGEST_JOB_KEY = "daily-digest-email";

type DailyJobsSchedulerState = {
  started: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  lastRunDateKey: string | null;
};

type FlightMovement = Prisma.MovementGetPayload<{
  include: { flight: true };
}>;

type PaymentMovement = Prisma.MovementGetPayload<{
  select: {
    id: true;
    userId: true;
    type: true;
    date: true;
    amount: true;
    notes: true;
    isDraft: true;
  };
}>;

type ReminderMovement = Prisma.MovementGetPayload<{
  select: {
    id: true;
    userId: true;
    type: true;
    date: true;
    notes: true;
  };
}>;

declare global {
  var __dailyJobsSchedulerState: DailyJobsSchedulerState | undefined;
}

function getSchedulerState(): DailyJobsSchedulerState {
  if (!globalThis.__dailyJobsSchedulerState) {
    globalThis.__dailyJobsSchedulerState = {
      started: false,
      intervalId: null,
      lastRunDateKey: null,
    };
  }

  return globalThis.__dailyJobsSchedulerState;
}

function getRomeDateKey(date = new Date()) {
  const parts = getRomeDateTimeParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function getRomeDayRange(date = new Date(), dayOffset = 0) {
  const todayRome = getRomeDateTimeParts(date);
  const targetMarker = new Date(Date.UTC(todayRome.year, todayRome.month - 1, todayRome.day + dayOffset, 12, 0, 0));
  const targetStartParts = getRomeDateTimeParts(targetMarker);
  const nextDayMarker = new Date(Date.UTC(todayRome.year, todayRome.month - 1, todayRome.day + dayOffset + 1, 12, 0, 0));
  const nextStartParts = getRomeDateTimeParts(nextDayMarker);

  return {
    key: `${targetStartParts.year}-${String(targetStartParts.month).padStart(2, "0")}-${String(targetStartParts.day).padStart(2, "0")}`,
    start: romeLocalDateTimeToUtcDate(targetStartParts.year, targetStartParts.month, targetStartParts.day, 0, 0, 0),
    end: romeLocalDateTimeToUtcDate(nextStartParts.year, nextStartParts.month, nextStartParts.day, 0, 0, 0),
  };
}

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
  if (item.type === MovementType.SERVICE) {
    return "Pagamento servizio";
  }

  if (Number(item.amount) < 0) {
    return "Addebito / correzione saldo";
  }

  return "Ricarica credito";
}

export function buildDailyDigestEmail(args: {
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

function buildSingleReminderEmail(reminder: ReminderMovement) {
  const hasTime = reminder.date.getHours() !== 0 || reminder.date.getMinutes() !== 0;
  const timeStr = hasTime ? ` alle ${formatTimeDisplay(reminder.date)}` : "";
  const subject = `Flight Logbook · Promemoria${timeStr}`;

  const text = `Promemoria Flight Logbook\n\nPromemoria${timeStr}: ${reminder.notes}`;

  const html = `
    <div style="margin: 0; padding: 32px 16px; background: #edf3f8; font-family: Inter, 'Segoe UI', Arial, sans-serif; color: #17324d;">
      <div style="max-width: 600px; margin: 0 auto;">
        <div style="margin: 0 0 24px; padding: 22px; border-radius: 24px; background: linear-gradient(135deg, #17324d 0%, #244a70 100%); color: #ffffff;">
          <div style="font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.78; margin-bottom: 10px;">
            Notifica Promemoria
          </div>
          <div style="font-size: 30px; line-height: 1.1; font-weight: 800; margin-bottom: 10px;">
            Flight Logbook
          </div>
        </div>

        <div style="background: #ffffff; border: 1px solid #dbe5f0; border-radius: 28px; padding: 24px;">
          <div style="margin: 0 0 14px; padding: 18px; border: 1px solid #bae6fd; border-radius: 20px; background: #f0f9ff;">
            <div style="font-size: 17px; font-weight: 800; color: #0369a1; margin-bottom: 6px;">
              🔔 Promemoria${escapeHtml(timeStr)}
            </div>
            <div style="font-size: 15px; line-height: 1.6; color: #0f172a; white-space: pre-wrap;">
              ${escapeHtml(reminder.notes ?? "")}
            </div>
          </div>
          <div style="font-size: 13px; line-height: 1.7; color: #4c5f76; margin-top: 24px; text-align: center;">
            Questo promemoria è stato generato automaticamente da <strong>Flight Logbook</strong>.
          </div>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

async function runDailyJobs(now = new Date()) {
  console.log(`[daily-jobs] Avvio controlli giornalieri per ${getRomeDateKey(now)}`);
  await runDailyChecksAndActions(now);
}

export async function checkAndSendTimedReminders(now = new Date()) {
  // Finestra temporale di 2 ore nel passato per intercettare promemoria dovuti
  const windowStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const windowEnd = now;

  const reminders = await prisma.movement.findMany({
    where: {
      type: MovementType.REMINDER,
      date: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    select: {
      id: true,
      userId: true,
      type: true,
      date: true,
      notes: true,
    },
  });

  for (const reminder of reminders) {
    const isTimed = hasTime(reminder.date);
    if (!isTimed) {
      continue;
    }

    const jobKey = `reminder-sent-${reminder.id}-${reminder.date.getTime()}`;

    const alreadySent = await prisma.dailyJobState.findUnique({
      where: { key: jobKey },
    });

    if (alreadySent) {
      continue;
    }

    const email = buildSingleReminderEmail(reminder);

    try {
      await sendUserEmail({
        userId: reminder.userId,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      console.log(`[daily-jobs] Email promemoria inviata a ${reminder.userId} per il promemoria ${reminder.id}`);

      await prisma.dailyJobState.create({
        data: {
          key: jobKey,
          lastRunDateKey: getRomeDateKey(now),
          lastRunAt: now,
        },
      });
    } catch (error) {
      console.error(`[daily-jobs] Errore invio email promemoria per utente ${reminder.userId}`, error);
    }
  }
}

async function getPersistedLastRunDateKey() {
  const jobState = await prisma.dailyJobState.findUnique({
    where: { key: DAILY_DIGEST_JOB_KEY },
    select: { lastRunDateKey: true },
  });

  return jobState?.lastRunDateKey ?? null;
}

async function savePersistedLastRun(now: Date, dateKey: string) {
  await prisma.dailyJobState.upsert({
    where: { key: DAILY_DIGEST_JOB_KEY },
    update: {
      lastRunDateKey: dateKey,
      lastRunAt: now,
    },
    create: {
      key: DAILY_DIGEST_JOB_KEY,
      lastRunDateKey: dateKey,
      lastRunAt: now,
    },
  });
}

export async function runDailyChecksAndActions(now = new Date()) {
  await runMonthlyReports(now);

  const todayRange = getRomeDayRange(now, 0);
  const tomorrowRange = getRomeDayRange(now, 1);

  const [tomorrowFlights, duePayments, todayReminders] = await Promise.all([
    prisma.movement.findMany({
      where: {
        type: MovementType.FLIGHT,
        isDraft: true,
        date: {
          gte: tomorrowRange.start,
          lt: tomorrowRange.end,
        },
      },
      include: { flight: true },
      orderBy: [{ userId: "asc" }, { date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.movement.findMany({
      where: {
        type: { in: [MovementType.TOPUP, MovementType.SERVICE] },
        isDraft: true,
        date: {
          gte: todayRange.start,
          lt: todayRange.end,
        },
      },
      select: {
        id: true,
        userId: true,
        type: true,
        date: true,
        amount: true,
        notes: true,
        isDraft: true,
      },
      orderBy: [{ userId: "asc" }, { date: "asc" }, { createdAt: "asc" }],
    }),
    prisma.movement.findMany({
      where: {
        type: MovementType.REMINDER,
        date: {
          gte: todayRange.start,
          lt: todayRange.end,
        },
      },
      select: {
        id: true,
        userId: true,
        type: true,
        date: true,
        notes: true,
      },
      orderBy: [{ userId: "asc" }, { date: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  // Filtriamo i promemoria di oggi escludendo quelli con un orario impostato.
  // Quelli con un orario impostato verranno inviati all'orario specifico.
  const remindersWithoutTime = todayReminders.filter((item) => {
    return !hasTime(item.date);
  });

  const userIds = new Set([
    ...tomorrowFlights.map((item) => item.userId),
    ...duePayments.map((item) => item.userId),
    ...remindersWithoutTime.map((item) => item.userId),
  ]);

  if (userIds.size === 0) {
    console.log("[daily-jobs] Nessun volo domani, pagamento oggi o promemoria oggi da notificare");
    return;
  }

  for (const userId of userIds) {
    const userTomorrowFlights = tomorrowFlights.filter((item) => item.userId === userId);
    const userDuePayments = duePayments.filter((item) => item.userId === userId);
    const userTodayReminders = remindersWithoutTime.filter((item) => item.userId === userId);

    if (
      userTomorrowFlights.length === 0 &&
      userDuePayments.length === 0 &&
      userTodayReminders.length === 0
    ) {
      continue;
    }

    const email = buildDailyDigestEmail({
      tomorrowFlights: userTomorrowFlights,
      duePayments: userDuePayments,
      todayReminders: userTodayReminders,
    });

    try {
      await sendUserEmail({
        userId,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      console.log(
        `[daily-jobs] Email inviata a ${userId}: ${userTomorrowFlights.length} voli domani, ${userDuePayments.length} pagamenti oggi, ${userTodayReminders.length} promemoria oggi`,
      );
    } catch (error) {
      console.error(`[daily-jobs] Errore invio email per utente ${userId}`, error);
    }
  }
}

async function runMonthlyReports(now: Date) {
  const parts = getRomeDateTimeParts(now);
  if (parts.day !== 1) return;

  const targetMonth = parts.month === 1 ? 12 : parts.month - 1;
  const targetYear = parts.month === 1 ? parts.year - 1 : parts.year;
  
  const jobKey = `monthly-report-${targetYear}-${targetMonth}`;
  
  const jobState = await prisma.dailyJobState.findUnique({
    where: { key: jobKey }
  });
  if (jobState) return;

  const partnerships = await prisma.partnership.findMany({
    include: {
      members: { include: { user: true } },
    }
  });

  const startOfMonth = new Date(targetYear, targetMonth - 1, 1);

  for (const partnership of partnerships) {
    if (partnership.members.length === 0) continue;

    try {
      const reportData = await calculateHistoricalReports(partnership.id, targetYear, targetMonth - 1);

      for (const member of partnership.members) {
        const userReport = reportData.reports.find(r => r.userId === member.userId);
        if (!userReport) continue;

        const email = buildMonthlyReportEmail({
          monthName: startOfMonth.toLocaleString('it-IT', { month: 'long', year: 'numeric' }),
          partnershipName: partnership.name,
          fixedCostPerMember: userReport.fixedCost,
          fixedCostTotal: reportData.fixedCostTotal,
          flightCost: userReport.flightCost,
          totalCost: userReport.totalCost,
          localBalance: userReport.localBalance,
          previousDebt: userReport.previousDebt,
          totalBalance: userReport.totalBalance,
          durationMinutes: userReport.durationMinutes,
          aircraftDetails: userReport.aircraftDetails,
          memberCount: partnership.members.length,
          advancedExpense: userReport.advancedExpense,
          disableSharedFund: partnership.disableSharedFund,
          maintenanceShare: userReport.maintenanceShare,
          hoursExpenseShare: userReport.hoursExpenseShare
        });

        try {
          await sendUserEmail({
            userId: member.userId,
            subject: email.subject,
            text: email.text,
            html: email.html,
          });
          console.log(`[daily-jobs] Inviato report mensile a ${member.userId} per società ${partnership.name}`);
        } catch(e) {
          console.error(`[daily-jobs] Errore invio report mensile a ${member.userId}`, e);
        }
      }
    } catch(err) {
      console.error(`[daily-jobs] Errore calcolo report mensile per società ${partnership.id}`, err);
    }
  }

  await prisma.dailyJobState.create({
    data: {
      key: jobKey,
      lastRunDateKey: getRomeDateKey(now),
      lastRunAt: now,
    }
  });
}

export function buildPreFlightWeatherEmail(args: {
  flight: FlightMovement;
  stationsWeather: {
    icao: string;
    name: string;
    metar: any;
    taf: any;
  }[];
}) {
  const { flight, stationsWeather } = args;

  const takeoff = flight.flight?.takeoffPlace || "?";
  const arrival = flight.flight?.arrivalPlace || "?";
  const routeStr = `${takeoff} ➔ ${arrival}`;
  const subject = `Flight Logbook · Briefing Meteo Pre-Volo (${routeStr})`;

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
    `Briefing Meteo Pre-Volo - Flight Logbook`,
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
            Briefing Meteo Pre-Volo (1 Ora alla Partenza)
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

export async function checkAndSendPreFlightWeatherEmails(now = new Date()) {
  const windowStart = now;
  const windowEnd = new Date(now.getTime() + 75 * 60 * 1000);

  const flights = await prisma.movement.findMany({
    where: {
      type: MovementType.FLIGHT,
      isDraft: true,
      date: {
        gte: windowStart,
        lte: windowEnd,
      },
    },
    include: {
      flight: true,
    },
  });

  for (const flight of flights) {
    const jobKey = `preflight-weather-sent-${flight.id}`;

    const alreadySent = await prisma.dailyJobState.findUnique({
      where: { key: jobKey },
    });

    if (alreadySent) {
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { id: flight.userId },
      include: { settings: true },
    });

    if (!user) {
      continue;
    }

    const defaultBase = user.settings?.defaultBase || "LIML";
    const routeQuery = [flight.flight?.takeoffPlace, flight.flight?.arrivalPlace]
      .filter(Boolean)
      .join(" - ") || flight.notes || "";

    if (!routeQuery) {
      continue;
    }

    const icaos = await resolveQueryToIcaos(routeQuery, defaultBase);
    if (icaos.length === 0) {
      continue;
    }

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

    try {
      await sendUserEmail({
        userId: flight.userId,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      console.log(
        `[daily-jobs] Email meteo pre-volo inviata con successo a ${user.email} per il volo ${flight.id}`
      );

      await prisma.dailyJobState.create({
        data: {
          key: jobKey,
          lastRunDateKey: getRomeDateKey(now),
          lastRunAt: now,
        },
      });
    } catch (error) {
      console.error(
        `[daily-jobs] Errore nell'invio dell'email meteo pre-volo per il volo ${flight.id}`,
        error
      );
    }
  }
}


async function tickDailyJobs() {
  const state = getSchedulerState();
  const now = new Date();
  const todayKey = getRomeDateKey(now);
  const romeNow = getRomeDateTimeParts(now);

  try {
    await checkAndSendTimedReminders(now);
  } catch (error) {
    console.error("[daily-jobs] Errore durante l'invio dei promemoria pianificati", error);
  }

  try {
    await checkAndSendPreFlightWeatherEmails(now);
  } catch (error) {
    console.error("[daily-jobs] Errore durante l'invio delle email meteo pre-volo", error);
  }


  if (state.lastRunDateKey === todayKey) {
    return;
  }

  if (romeNow.hour < DAILY_RUN_HOUR) {
    return;
  }

  try {
    const persistedLastRunDateKey = await getPersistedLastRunDateKey();

    if (persistedLastRunDateKey === todayKey) {
      state.lastRunDateKey = todayKey;
      return;
    }

    await runDailyJobs(now);
    await savePersistedLastRun(now, todayKey);
    state.lastRunDateKey = todayKey;
  } catch (error) {
    console.error("[daily-jobs] Errore durante l'esecuzione giornaliera", error);
    state.lastRunDateKey = null;
  }
}

export function startDailyJobsScheduler() {
  const state = getSchedulerState();

  if (state.started) {
    return;
  }

  state.started = true;

  void tickDailyJobs();

  state.intervalId = setInterval(() => {
    void tickDailyJobs();
  }, ONE_MINUTE_MS);

  console.log(`[daily-jobs] Scheduler giornaliero avviato (run alle ${String(DAILY_RUN_HOUR).padStart(2, "0")}:00 ${ROME_TIME_ZONE})`);
}
