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
      partnership: { select: { name: true } },
      fuelLogs: { orderBy: { refueledAt: "desc" }, take: 1 },
    },
    orderBy: [{ partnershipId: "asc" }, { registration: "asc" }],
  });

  const options = aircrafts.map((a) => {
    const last = a.fuelLogs[0];
    return {
      id: a.id,
      label: `${a.registration} (${a.type}) · ${a.partnership.name}`,
      tanksMax: tanksLimit(a.hangarCapacityLiters),
      aircraftMax: aircraftLimit(a.tankCapacityLiters),
      lastTanksAfter: last ? last.tanksAfterLiters : null,
      lastAircraftAfter: last ? last.aircraftAfterLiters : null,
    };
  });

  return (
    <AppShell
      title="Rifornimento Società"
      subtitle="Registra i litri nelle taniche dell'hangar e nell'aereo prima e dopo il rifornimento."
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
