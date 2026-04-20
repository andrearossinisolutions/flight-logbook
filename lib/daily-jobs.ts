import { MovementType, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendUserEmail } from "@/lib/mail";
import {
  eur,
  formatDateDisplay,
  formatTimeDisplay,
  minutesToHoursMinutes,
} from "@/lib/utils";

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

function getRomeDateTimeParts(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: ROME_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const formattedParts = formatter.formatToParts(date);

  return {
    year: Number(formattedParts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(formattedParts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(formattedParts.find((part) => part.type === "day")?.value ?? "0"),
    hour: Number(formattedParts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(formattedParts.find((part) => part.type === "minute")?.value ?? "0"),
    second: Number(formattedParts.find((part) => part.type === "second")?.value ?? "0"),
  };
}

function getRomeDateKey(date = new Date()) {
  const parts = getRomeDateTimeParts(date);
  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

function romeLocalDateTimeToUtcDate(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0,
) {
  const utcGuess = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  const romePartsAtGuess = getRomeDateTimeParts(utcGuess);
  const expectedAsUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  const actualAsUtc = Date.UTC(
    romePartsAtGuess.year,
    romePartsAtGuess.month - 1,
    romePartsAtGuess.day,
    romePartsAtGuess.hour,
    romePartsAtGuess.minute,
    romePartsAtGuess.second,
  );

  return new Date(utcGuess.getTime() + (expectedAsUtc - actualAsUtc));
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

  if (flight.instructorMinutes === flight.durationMinutes) {
    return "Lezione";
  }

  if (flight.instructorMinutes > 0 && flight.instructorMinutes < flight.durationMinutes) {
    return "Noleggio con lezione";
  }

  return "Noleggio";
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

function buildDailyDigestEmail(args: {
  tomorrowFlights: FlightMovement[];
  duePayments: PaymentMovement[];
}) {
  const { tomorrowFlights, duePayments } = args;
  const totalPaymentsAmount = duePayments.reduce((sum, item) => sum + Math.abs(Number(item.amount)), 0);

  const subjectParts = [];
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

  const flightText = tomorrowFlights.length > 0
    ? [
        "Voli pianificati per domani:",
        ...tomorrowFlights.map((item, index) => {
          const route = item.flight?.takeoffPlace || item.flight?.arrivalPlace
            ? ` · ${item.flight?.takeoffPlace ?? "?"} -> ${item.flight?.arrivalPlace ?? "?"}`
            : "";

          const notes = item.notes ? `\n  Note: ${item.notes}` : "";

          return `${index + 1}. ${formatDateDisplay(item.date)} ${formatTimeDisplay(item.date)} · ${flightType(item.flight)} · ` +
            `${item.flight?.aircraftRegistration ?? "I-4150"} (${item.flight?.aircraftType ?? "P92"}) · ` +
            `${minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}${route}${notes}`;
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
        ${tomorrowFlights.length > 0 ? `Hai <strong>${tomorrowFlights.length}</strong> ${tomorrowFlights.length === 1 ? "volo pianificato per domani" : "voli pianificati per domani"}` : "Nessun volo pianificato per domani"}
        ${tomorrowFlights.length > 0 && duePayments.length > 0 ? "<br />" : ""}
        ${duePayments.length > 0 ? `Hai <strong>${duePayments.length}</strong> ${duePayments.length === 1 ? "pagamento in scadenza oggi" : "pagamenti in scadenza oggi"}` : ""}
      </div>
    </div>
  `;

  const statsHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px; border-collapse: separate; border-spacing: 0 12px;">
      <tr>
        <td width="50%" style="padding-right: 6px;">
          <div style="background: #f5f8fc; border: 1px solid #dbe5f0; border-radius: 18px; padding: 18px;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #5b718c; margin-bottom: 8px;">Voli domani</div>
            <div style="font-size: 28px; font-weight: 800; color: #17324d;">${tomorrowFlights.length}</div>
          </div>
        </td>
        <td width="50%" style="padding-left: 6px;">
          <div style="background: #fff7f2; border: 1px solid #f1d7c8; border-radius: 18px; padding: 18px;">
            <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #8b5c3d; margin-bottom: 8px;">Scadenze oggi</div>
            <div style="font-size: 28px; font-weight: 800; color: #7f3f1d;">${duePayments.length}</div>
            ${duePayments.length > 0
              ? `<div style="margin-top: 8px; font-size: 14px; color: #8b5c3d;">Totale: <strong>${escapeHtml(eur(totalPaymentsAmount))}</strong></div>`
              : ""}
          </div>
        </td>
      </tr>
    </table>
  `;

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
        ${statsHtml}

        <div style="background: #ffffff; border: 1px solid #dbe5f0; border-radius: 28px; padding: 24px;">
          <div style="font-size: 15px; line-height: 1.7; color: #4c5f76; margin-bottom: 24px;">
            Questo riepilogo è stato generato automaticamente da <strong style="color: #17324d;">Flight Logbook</strong>
            per aiutarti a tenere sotto controllo pianificazioni e scadenze della giornata.
          </div>

          ${flightHtml}
          ${paymentsHtml}
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
  const todayRange = getRomeDayRange(now, 0);
  const tomorrowRange = getRomeDayRange(now, 1);

  const [tomorrowFlights, duePayments] = await Promise.all([
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
  ]);

  const userIds = new Set([
    ...tomorrowFlights.map((item) => item.userId),
    ...duePayments.map((item) => item.userId),
  ]);

  if (userIds.size === 0) {
    console.log("[daily-jobs] Nessun volo di domani o pagamento di oggi da notificare");
    return;
  }

  for (const userId of userIds) {
    const userTomorrowFlights = tomorrowFlights.filter((item) => item.userId === userId);
    const userDuePayments = duePayments.filter((item) => item.userId === userId);

    if (userTomorrowFlights.length === 0 && userDuePayments.length === 0) {
      continue;
    }

    const email = buildDailyDigestEmail({
      tomorrowFlights: userTomorrowFlights,
      duePayments: userDuePayments,
    });

    try {
      await sendUserEmail({
        userId,
        subject: email.subject,
        text: email.text,
        html: email.html,
      });

      console.log(
        `[daily-jobs] Email inviata a ${userId}: ${userTomorrowFlights.length} voli domani, ${userDuePayments.length} pagamenti oggi`,
      );
    } catch (error) {
      console.error(`[daily-jobs] Errore invio email per utente ${userId}`, error);
    }
  }
}

async function tickDailyJobs() {
  const state = getSchedulerState();
  const now = new Date();
  const todayKey = getRomeDateKey(now);
  const romeNow = getRomeDateTimeParts(now);

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
