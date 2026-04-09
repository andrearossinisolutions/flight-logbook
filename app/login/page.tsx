import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";
import LoginForm from "./login-form";

export default async function LoginPage() {
  const session = await getSessionFromCookie();

  if (session) {
    redirect("/dashboard");
  }

  return <LoginForm />;
}