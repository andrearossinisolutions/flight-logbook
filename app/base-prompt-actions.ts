"use server";

import { revalidatePath } from "next/cache";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function saveBaseFromPromptAction(base: string) {
  const session = await getSessionFromCookie();
  if (!session) return;

  const defaultBase = base.trim().slice(0, 100);
  if (!defaultBase) return;

  await prisma.settings.update({
    where: { userId: session.userId },
    data: { defaultBase },
  });
  revalidatePath("/", "layout");
}

export async function dismissBasePromptAction() {
  const session = await getSessionFromCookie();
  if (!session) return;

  await prisma.settings.updateMany({
    where: { userId: session.userId },
    data: { basePromptDismissedAt: new Date() },
  });
  revalidatePath("/", "layout");
}
