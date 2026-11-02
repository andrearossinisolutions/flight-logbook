import Link from "next/link";
import type { Route } from "next";
import { AppShell } from "@/components/app-shell";
import RefuelForm from "@/components/refuel-form";
import { prisma } from "@/lib/prisma";
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

  // Ultimo stato dell'aereo: solo dai rifornimenti che lo riguardano (non quelli delle sole taniche).
  const lastAircraftLogs = await prisma.partnershipFuelLog.findMany({
    where: { aircraftId: { in: aircrafts.map((a) => a.id) }, aircraftAfterLiters: { not: null } },
    orderBy: { refueledAt: "desc" },
    select: { aircraftId: true, aircraftAfterLiters: true },
  });
  const aircraftLastMap = new Map<string, number | null>();
  for (const l of lastAircraftLogs) {
    if (!aircraftLastMap.has(l.aircraftId)) aircraftLastMap.set(l.aircraftId, l.aircraftAfterLiters);
  }

  const options = aircrafts.map((a) => {
    const last = a.fuelLogs[0];
    const lastWithAircraft = aircraftLastMap.get(a.id) ?? null;
    return {
      id: a.id,
      label: `${a.registration} (${a.type}) · ${a.partnership.name}`,
      tanksMax: tanksLimit(a.hangarCapacityLiters),
      aircraftMax: aircraftLimit(a.tankCapacityLiters),
      lastTanksAfter: last ? last.tanksAfterLiters : null,
      lastAircraftAfter: lastWithAircraft,
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
