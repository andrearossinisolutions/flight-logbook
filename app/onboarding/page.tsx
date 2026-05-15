import { requireUser } from "@/lib/require-user";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { redirect } from "next/navigation";

export default async function OnboardingPage() {
  const user = await requireUser();
  
  // If already completed, go back to dashboard
  if (user.settings?.onboardingCompleted) {
    redirect("/dashboard");
  }

  return <OnboardingFlow userName={user.fullName} />;
}
