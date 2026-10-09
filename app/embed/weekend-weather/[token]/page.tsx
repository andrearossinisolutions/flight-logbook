import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WeekendWeatherBriefing from "@/components/weekend-weather-briefing";

export const dynamic = "force-dynamic";

interface EmbedWeekendWeatherPageProps {
  params: Promise<{ token: string }>;
}

export default async function EmbedWeekendWeatherPage({ params }: EmbedWeekendWeatherPageProps) {
  const { token } = await params;

  const settings = await prisma.settings.findUnique({ where: { weatherShareToken: token } });
  if (!settings) {
    notFound();
  }

  const base = settings.defaultBase?.trim() || "LIML";

  return (
    <div style={{ padding: 12 }}>
      <WeekendWeatherBriefing defaultBase={base} embedded />
    </div>
  );
}
