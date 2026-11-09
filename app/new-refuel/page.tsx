import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import RefuelForm from "@/components/refuel-form";
import { prisma } from "@/lib/prisma";
import { getHangarStatus, getOnboardStatus } from "@/lib/fuel-onboard";
import { requireUser } from "@/lib/require-user";
import { createRefuel } from "@/app/refuel-actions";
import { aircraftLimit, tanksLimit } from "@/lib/fuel";
import { formatDateTimeInput } from "@/lib/utils";

export default async function NewRefuelPage() {
  const user = await requireUser();

  const aircrafts = await prisma.partnershipAircraft.findMany({
    where: { partnership: { members: { some: { userId: user.id } } } },
    include: {
      partnership: { select: { name: true, disableSharedFund: true } },
      fuelLogs: { orderBy: { refueledAt: "desc" }, take: 1 },
    },
    orderBy: [{ partnershipId: "asc" }, { registration: "asc" }],
  });

  // Litri a bordo: dato certo (ultimo volo o rifornimento) oppure stima dai voli successivi.
  const hangarMap = new Map<string, number>();
  const onboardMap = new Map<string, { liters: number | null; certain: boolean }>();
  for (const a of aircrafts) {
    const status = await getOnboardStatus(a, a.partnershipId);
    const hangar = await getHangarStatus(a.id, a.partnershipId);
    if (hangar) hangarMap.set(a.id, hangar.liters);
    if (status) onboardMap.set(a.id, { liters: status.result.liters, certain: status.result.certain });
  }

  const options = aircrafts.map((a) => {
    const onboard = onboardMap.get(a.id);
    const onboardLiters = onboard && onboard.liters !== null ? Math.round(onboard.liters * 10) / 10 : null;
    return {
      id: a.id,
      label: `${a.registration} (${a.type}) · ${a.partnership.name}`,
      tanksMax: tanksLimit(a.hangarCapacityLiters),
      aircraftMax: aircraftLimit(a.tankCapacityLiters),
      lastTanksAfter: hangarMap.get(a.id) ?? null,
      lastAircraftAfter: onboardLiters,
      lastAircraftAfterEstimated: onboardLiters !== null && !onboard?.certain,
      fuelPricePerLiter: a.fuelPricePerLiter,
      disableSharedFund: a.partnership.disableSharedFund,
    };
  });

  return (
    <AppShell
      title="Rifornimento Società"
      subtitle="Registra un rifornimento delle taniche dell'hangar o dell'aereo."
    >
      {options.length === 0 ? (
        <div className="card">
          <p>Non hai ancora aerei di società a cui registrare un rifornimento.</p>
          <Link href={"/societa" as Route} className="btn secondary">
            Vai alle società
          </Link>
        </div>
      ) : (
        <RefuelForm
          action={createRefuel}
          aircrafts={options}
          defaultDateTime={formatDateTimeInput(new Date())}
        />
      )}
    </AppShell>
  );
}
