import { prisma } from "@/lib/prisma";
import { BaseSetupPromptDialog } from "@/components/base-setup-prompt-dialog";

const PROMPT_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000;

async function suggestBase(userId: string): Promise<string | null> {
  const flights = await prisma.flight.findMany({
    where: { movement: { userId, isDraft: false }, takeoffPlace: { not: null } },
    select: { takeoffPlace: true },
    take: 500,
    orderBy: { createdAt: "desc" },
  });

  const counts = new Map<string, { name: string; count: number }>();
  for (const f of flights) {
    const name = f.takeoffPlace?.trim();
    if (!name) continue;
    const key = name.toUpperCase();
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { name, count: 1 });
  }

  let best: { name: string; count: number } | null = null;
  for (const entry of counts.values()) {
    if (!best || entry.count > best.count) best = entry;
  }
  return best?.name ?? null;
}

export async function BaseSetupPrompt({ userId }: { userId: string }) {
  const settings = await prisma.settings.findUnique({ where: { userId } });

  // Stesse condizioni del promemoria email (checkAndSendNoBaseReminders in lib/daily-jobs.ts):
  // niente prompt durante l'onboarding o se la base è già impostata
  if (!settings || !settings.onboardingCompleted || settings.defaultBase?.trim()) return null;

  const dismissedAt = settings.basePromptDismissedAt;
  if (dismissedAt && Date.now() - dismissedAt.getTime() < PROMPT_INTERVAL_MS) return null;

  const suggestion = await suggestBase(userId);

  return <BaseSetupPromptDialog suggestion={suggestion} />;
}
