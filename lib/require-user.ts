import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionFromCookie } from "@/lib/auth";

export async function requireUser() {
  const session = await getSessionFromCookie();
  if (!session) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { settings: true },
  });

  if (!user) {
    redirect("/login");
  }

  return user;
}
