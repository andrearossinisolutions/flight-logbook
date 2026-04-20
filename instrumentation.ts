import { startDailyJobsScheduler } from "@/lib/daily-jobs";

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  startDailyJobsScheduler();
}
