import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { topupSchema } from "@/lib/validators";
import { parseRomeDateTime } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getSessionFromCookie();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const formData = await request.formData();
  const parsed = topupSchema.safeParse(Object.fromEntries(formData.entries()));

  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Dati non validi", { status: 400 });
  }

  const dateParsed = parseRomeDateTime(parsed.data.date);
  if (!dateParsed) {
    return new Response("Data non valida", { status: 400 });
  }

  await prisma.movement.create({
    data: {
      userId: session.userId,
      type: "TOPUP",
      date: dateParsed,
      isDraft: false,
      amount: parsed.data.amount,
      notes: parsed.data.notes || null,
    },
  });

  redirect("/logbook");
}
