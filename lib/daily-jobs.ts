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

  const flightHtml = tomorrowFlights.length > 0
    ? `
      <h2>Voli pianificati per domani</h2>
      <ul>
        ${tomorrowFlights
          .map((item) => {
            const route = item.flight?.takeoffPlace || item.flight?.arrivalPlace
              ? ` · ${escapeHtml(item.flight?.takeoffPlace ?? "?")} ➡️ ${escapeHtml(item.flight?.arrivalPlace ?? "?")}`
              : "";

            const notes = item.notes
              ? `<br /><span><strong>Note:</strong> ${escapeHtml(item.notes)}</span>`
              : "";

            return `
              <li>
                <strong>${escapeHtml(flightType(item.flight))}</strong> ·
                ${escapeHtml(item.flight?.aircraftRegistration ?? "I-4150")} (${escapeHtml(item.flight?.aircraftType ?? "P92")}) ·
                ${escapeHtml(formatDateDisplay(item.date))} ${escapeHtml(formatTimeDisplay(item.date))} ·
                ${escapeHtml(minutesToHoursMinutes(item.flight?.durationMinutes ?? 0))}
                ${route}
                ${notes}
              </li>
            `;
          })
          .join("")}
      </ul>
    `
    : "";

  const paymentsHtml = duePayments.length > 0
    ? `
      <h2>Pagamenti in scadenza oggi</h2>
      <ul>
        ${duePayments
          .map((item) => {
            const notes = item.notes
              ? `<br /><span><strong>Note:</strong> ${escapeHtml(item.notes)}</span>`
              : "";

            return `
              <li>
                <strong>${escapeHtml(paymentTypeLabel(item))}</strong> ·
                ${escapeHtml(eur(Number(item.amount)))}
                ${notes}
              </li>
            `;
          })
          .join("")}
      </ul>
    `
    : "";

  const html = `
    <div>
      <p>Promemoria giornaliero <strong>Flight Logbook</strong>.</p>
      ${flightHtml}
      ${paymentsHtml}
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
