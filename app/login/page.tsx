import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import LoginForm from "./login-form";
import { prisma } from "@/lib/prisma";

export default async function LoginPage() {
  const session = await getSessionFromCookie();

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/api/auth/logout?redirect=/login");
    }
  }

  return <LoginForm />;
}