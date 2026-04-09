import { NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { settingsSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const parsed = settingsSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Dati non validi", { status: 400 });
  }

  const { rentalRatePerHour, instructorRatePerHour, currency } = parsed.data;

  await prisma.settings.upsert({
    where: { userId: session.userId },
    update: {
      rentalRatePerHour,
      instructorRatePerHour,
      currency,
    },
    create: {
      userId: session.userId,
      rentalRatePerHour,
      instructorRatePerHour,
      currency,
    },
  });

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
