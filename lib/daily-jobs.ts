const ONE_MINUTE_MS = 60 * 1000;

type DailyJobsSchedulerState = {
  started: boolean;
  intervalId: ReturnType<typeof setInterval> | null;
  lastRunDateKey: string | null;
};

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

function getDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

async function runDailyJobs(now = new Date()) {
  console.log(`[daily-jobs] Avvio controlli giornalieri per ${getDateKey(now)}`);

  await runDailyChecksAndActions(now);
}

export async function runDailyChecksAndActions(now = new Date()) {
  console.log(`[daily-jobs] Nessun controllo configurato per ${getDateKey(now)}`);
}

async function tickDailyJobs() {
  const state = getSchedulerState();
  const now = new Date();
  const todayKey = getDateKey(now);

  if (state.lastRunDateKey === todayKey) {
    return;
  }

  state.lastRunDateKey = todayKey;

  try {
    await runDailyJobs(now);
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

  console.log("[daily-jobs] Scheduler giornaliero avviato");
}
