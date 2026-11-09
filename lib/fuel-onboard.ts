import { prisma } from "@/lib/prisma";
import { resolveOnboard, type OnboardAnchor, type OnboardResult } from "@/lib/fuel";

export type OnboardStatus = {
  anchor: OnboardAnchor;
  result: OnboardResult;
};

/**
 * Stato del carburante a bordo di un aereo di società: ancora = dato più recente tra
 * ultimo rifornimento con litri a bordo e ultimo volo (non bozza) con litri di arrivo.
 * Null se non c'è nessuna ancora.
 */
export async function getOnboardStatus(
  aircraft: { id: string; fuelBurnLitersPerHour: number; tankCapacityLiters: number },
  partnershipId: string
): Promise<OnboardStatus | null> {
  const [refuel, flight] = await Promise.all([
    prisma.partnershipFuelLog.findFirst({
      where: { aircraftId: aircraft.id, partnershipId, aircraftAfterLiters: { not: null } },
      orderBy: { refueledAt: "desc" },
      select: { refueledAt: true, aircraftAfterLiters: true, user: { select: { fullName: true, email: true } } },
    }),
    prisma.flight.findFirst({
      where: {
        partnershipAircraftId: aircraft.id,
        fuelEndLiters: { not: null },
        movement: { isDraft: false },
      },
      orderBy: [{ movement: { date: "desc" } }, { createdAt: "desc" }],
      select: {
        id: true,
        fuelEndLiters: true,
        movement: { select: { date: true, user: { select: { fullName: true, email: true } } } },
      },
    }),
  ]);

  let anchor: OnboardAnchor | null = null;
  let anchorFlightId: string | null = null;
  const refuelWins =
    refuel && refuel.aircraftAfterLiters !== null && (!flight || refuel.refueledAt > flight.movement.date);
  if (refuelWins && refuel && refuel.aircraftAfterLiters !== null) {
    anchor = {
      source: "REFUEL",
      at: refuel.refueledAt,
      liters: refuel.aircraftAfterLiters,
      author: refuel.user ? refuel.user.fullName || refuel.user.email : null,
    };
  } else if (flight && flight.fuelEndLiters !== null) {
    anchorFlightId = flight.id;
    anchor = {
      source: "FLIGHT",
      at: flight.movement.date,
      liters: flight.fuelEndLiters,
      author: flight.movement.user ? flight.movement.user.fullName || flight.movement.user.email : null,
    };
  }
  if (!anchor) return null;

  const flightsAfter = await prisma.flight.findMany({
    where: {
      partnershipAircraftId: aircraft.id,
      movement: { isDraft: false, date: { gt: anchor.at } },
      ...(anchorFlightId ? { id: { not: anchorFlightId } } : {}),
    },
    orderBy: [{ movement: { date: "asc" } }, { createdAt: "asc" }],
    select: { durationMinutes: true, fuelStartLiters: true, fuelEnRouteLiters: true, fuelEndLiters: true },
  });

  return {
    anchor,
    result: resolveOnboard({
      anchor,
      flightsAfter,
      burnLitersPerHour: aircraft.fuelBurnLitersPerHour,
      tankCapacityLiters: aircraft.tankCapacityLiters,
    }),
  };
}
