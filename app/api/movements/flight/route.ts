import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { flightSchema, getDurationMinutes } from "@/lib/validators";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const parsed = flightSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Dati non validi", { status: 400 });
  }

  const settings = await prisma.settings.findUnique({ where: { userId: session.userId } });
  const rentalRate = Number(settings?.rentalRatePerHour ?? 150);
  const instructorRate = Number(settings?.instructorRatePerHour ?? 80);
  const durationMinutes = getDurationMinutes(parsed.data);
  const durationHours = durationMinutes / 60;
  const hasInstructor = Boolean(parsed.data.instructorName?.trim());

  const rentalCost = Number((durationHours * rentalRate).toFixed(2));
  const instructorCost = hasInstructor ? Number((durationHours * instructorRate).toFixed(2)) : 0;
  const totalCost = Number((rentalCost + instructorCost).toFixed(2));

  const hobbsStartMinutes =
    parsed.data.inputMode === "HOBBS"
      ? parsed.data.hobbsStartHours! * 60 + parsed.data.hobbsStartMinutes!
      : null;

  const hobbsEndMinutes =
    parsed.data.inputMode === "HOBBS"
      ? parsed.data.hobbsEndHours! * 60 + parsed.data.hobbsEndMinutes!
      : null;

  await prisma.movement.create({
    data: {
      userId: session.userId,
      type: "FLIGHT",
      date: new Date(parsed.data.date),
      amount: -totalCost,
      notes: parsed.data.notes || null,
      flight: {
        create: {
          aircraft: parsed.data.aircraft,
          inputMode: parsed.data.inputMode,
          hobbsStartMinutes,
          hobbsEndMinutes,
          durationMinutes,
          instructorName: parsed.data.instructorName?.trim() || null,
          rentalRateApplied: rentalRate,
          instructorRateApplied: instructorRate,
          rentalCost,
          instructorCost,
          totalCost,
        },
      },
    },
  });

  redirect("/dashboard");
}
