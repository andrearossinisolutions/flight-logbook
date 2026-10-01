import { redirect } from "next/navigation";
import type { Route } from "next";
import { getSessionFromCookie } from "@/lib/auth";
import LoginForm from "./login-form";
import { prisma } from "@/lib/prisma";

interface LoginPageProps {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirect: redirectTo } = await searchParams;
  const safeRedirectTo = redirectTo && redirectTo.startsWith("/") ? redirectTo : "/logbook";

  const session = await getSessionFromCookie();

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    if (user) {
      redirect(safeRedirectTo as Route);
    } else {
      redirect("/api/auth/logout?redirect=/login");
    }
  }

  return <LoginForm redirectTo={safeRedirectTo} />;
}
