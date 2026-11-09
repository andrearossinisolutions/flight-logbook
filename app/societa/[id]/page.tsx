import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { PartnershipTabs } from "./tabs";
import { PartnershipSelector } from "@/components/partnership-selector";
import { getHangarStatus, getOnboardStatus } from "@/lib/fuel-onboard";

export default async function SocietaDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { editBookingId, tab, prefillAircraftId, prefillStartTime, prefillEndTime, prefillNotes } = await searchParams;

  const partnership = await prisma.partnership.findFirst({
    where: {
      id,
      members: { some: { userId: user.id } }
    },
    include: {
      members: {
        include: { user: true }
      },
      aircrafts: {
        include: {
          flights: {
            where: {
              movement: {
                isDraft: false
              }
            },
            select: {
              durationMinutes: true
            }
          },
          reminders: {
            include: {
              covers: true,
              coveredBy: true
            },
            orderBy: {
              hoursInterval: 'asc'
            }
          },
          maintenanceLogs: {
            orderBy: {
              date: 'desc'
            }
          },
          documents: {
            select: {
              id: true,
              aircraftId: true,
              name: true,
              contentType: true,
              size: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      },
      fixedCosts: true,
      transactions: {
        include: { user: true, recipient: true },
        orderBy: { date: 'desc' }
      },
      invitations: true,
      messages: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
      },
      bookings: {
        include: {
          user: true,
          aircraft: true,
        },
        orderBy: {
          startTime: 'asc'
        }
      }
    }
  });

  if (!partnership) {
    redirect("/societa" as Route);
  }

  const lastFlights = await prisma.flight.findMany({
    where: {
      partnershipAircraft: {
        partnershipId: id,
      },
      movement: {
        isDraft: false,
      },
    },
    include: {
      movement: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      movement: {
        date: "desc",
      },
    },
    take: 3,
  });

  const partnershipFlights = await prisma.flight.findMany({
    where: {
      partnershipAircraft: {
        partnershipId: id,
      },
      movement: {
        isDraft: false,
      },
    },
    include: {
      movement: {
        include: {
          user: true,
        },
      },
    },
    orderBy: {
      movement: {
        date: "desc",
      },
    },
  });

  const isAdmin = partnership.members.find(m => m.userId === user.id)?.role === "ADMIN";

  const memberships = await prisma.partnershipMember.findMany({
    where: { userId: user.id },
    include: { partnership: true }
  });

  const userPartnerships = memberships.map(m => ({
    id: m.partnership.id,
    name: m.partnership.name
  }));

  const serializedPartnership = {
    ...partnership,
    createdAt: partnership.createdAt.toISOString(),
    updatedAt: partnership.updatedAt.toISOString(),
    members: partnership.members.map(m => ({
      ...m,
      user: {
        id: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
      }
    })),
    aircrafts: partnership.aircrafts.map(a => {
      const flightMinutes = a.flights.reduce((sum, f) => sum + f.durationMinutes, 0);
      const totalHours = Number(a.initialHours) + (flightMinutes / 60);
      return {
        ...a,
        initialHours: Number(a.initialHours),
        hourlyFuelCost: Number(a.hourlyFuelCost),
        hourlyMaintCost: Number(a.hourlyMaintCost),
        hourlyEngineFund: Number(a.hourlyEngineFund),
        totalHours,
        reminders: (a.reminders || []).map(r => ({
          ...r,
          hoursInterval: r.hoursInterval ? Number(r.hoursInterval) : null,
          lastCompletedHours: Number(r.lastCompletedHours),
          monthsInterval: r.monthsInterval ? Number(r.monthsInterval) : null,
          lastCompletedDate: r.lastCompletedDate ? r.lastCompletedDate.toISOString() : null,
          covers: (r.covers || []).map((c: any) => ({ id: c.id, description: c.description })),
          coveredBy: (r.coveredBy || []).map((c: any) => ({ id: c.id, description: c.description })),
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
        maintenanceLogs: (a.maintenanceLogs || []).map(l => ({
          ...l,
          performedAtHours: Number(l.performedAtHours),
          cost: l.cost ? Number(l.cost) : null,
          date: l.date.toISOString(),
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
        })),
        documents: (a.documents || []).map(d => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
      };
    }),
    fixedCosts: partnership.fixedCosts.map(c => ({
      ...c,
      amount: Number(c.amount),
    })),
    transactions: partnership.transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      user: t.user ? { id: t.user.id, fullName: t.user.fullName, email: t.user.email } : null,
      recipient: t.recipient ? { id: t.recipient.id, fullName: t.recipient.fullName, email: t.recipient.email } : null,
    })),
    invitations: (partnership.invitations || []).map(i => ({
      ...i,
      createdAt: i.createdAt.toISOString(),
      updatedAt: i.updatedAt.toISOString(),
    })),
    messages: (partnership.messages || []).map(m => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
      user: m.user ? { fullName: m.user.fullName, email: m.user.email } : null,
    })),
    bookings: (partnership.bookings || []).map(b => ({
      ...b,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
      user: {
        id: b.user.id,
        fullName: b.user.fullName,
        email: b.user.email,
      },
      aircraft: {
        id: b.aircraft.id,
        registration: b.aircraft.registration,
        type: b.aircraft.type,
      }
    }))
  };

  // Stato carburante per aereo: ultimo rifornimento (refueledAt massimo) e stime da voli successivi.
  const fuelStatus = await Promise.all(
    partnership.aircrafts.map(async (a) => {
      const last = await prisma.partnershipFuelLog.findFirst({
        where: { aircraftId: a.id, partnershipId: id },
        orderBy: { refueledAt: "desc" },
        include: { user: { select: { fullName: true, email: true } } },
      });

      const hangar = await getHangarStatus(a.id, id);

      // A bordo adesso: dato certo (ultimo volo o rifornimento) oppure stima dai voli successivi.
      const onboard = await getOnboardStatus(a, id);
      const rangeHours =
        onboard && onboard.result.liters !== null && a.fuelBurnLitersPerHour > 0
          ? onboard.result.liters / a.fuelBurnLitersPerHour
          : null;

      return {
        aircraftId: a.id,
        registration: a.registration,
        type: a.type,
        burnLitersPerHour: a.fuelBurnLitersPerHour,
        hangarCapacityLiters: a.hangarCapacityLiters,
        tankCapacityLiters: a.tankCapacityLiters,
        hangar: hangar
          ? {
              liters: hangar.liters,
              at: hangar.at.toISOString(),
              source: hangar.source,
              author: hangar.author,
            }
          : null,
        last: last
          ? {
              refueledAt: last.refueledAt.toISOString(),
              tanksAfterLiters: last.tanksAfterLiters,
              aircraftAfterLiters: last.aircraftAfterLiters,
              author: last.user ? (last.user.fullName || last.user.email) : null,
            }
          : null,
        onboardSource: onboard ? onboard.anchor.source : null,
        onboardAnchorAt: onboard ? onboard.anchor.at.toISOString() : null,
        onboardAnchorLiters: onboard ? onboard.anchor.liters : null,
        onboardAnchorAuthor: onboard ? onboard.anchor.author : null,
        estimatedLiters: onboard ? onboard.result.liters : null,
        certain: onboard ? onboard.result.certain : false,
        reason: onboard ? onboard.result.reason : null,
        flightsSince: onboard ? onboard.result.flightsSince : 0,
        hoursSince: onboard ? onboard.result.hoursSince : 0,
        enRouteSinceLiters: onboard ? onboard.result.enRouteSinceLiters : 0,
        rangeHours,
      };
    })
  );

  const fuelLogs = await prisma.partnershipFuelLog.findMany({
    where: { partnershipId: id },
    orderBy: { refueledAt: "desc" },
    take: 500,
    include: {
      aircraft: { select: { registration: true, type: true } },
      user: { select: { fullName: true, email: true } },
      transaction: { select: { id: true } },
    },
  });

  const serializedFuelLogs = fuelLogs.map((l) => ({
    id: l.id,
    userId: l.userId,
    aircraftId: l.aircraftId,
    aircraftRegistration: l.aircraft.registration,
    aircraftType: l.aircraft.type,
    tanksBeforeLiters: l.tanksBeforeLiters,
    aircraftBeforeLiters: l.aircraftBeforeLiters,
    tanksAfterLiters: l.tanksAfterLiters,
    aircraftAfterLiters: l.aircraftAfterLiters,
    kind: l.kind,
    filledLiters: l.filledLiters,
    pricePaid: l.pricePaid,
    hasExpense: !!l.transaction,
    refueledAt: l.refueledAt.toISOString(),
    author: l.user ? (l.user.fullName || l.user.email) : null,
  }));

  const serializedLastFlights = lastFlights.map(f => ({
    id: f.id,
    aircraftRegistration: f.aircraftRegistration,
    aircraftType: f.aircraftType,
    durationMinutes: f.durationMinutes,
    takeoffPlace: f.takeoffPlace,
    arrivalPlace: f.arrivalPlace,
    totalCost: Number(f.totalCost),
    createdAt: f.createdAt.toISOString(),
    movement: {
      id: f.movement.id,
      userId: f.movement.userId,
      date: f.movement.date.toISOString(),
      notes: f.movement.notes,
      user: {
        id: f.movement.user.id,
        fullName: f.movement.user.fullName,
        email: f.movement.user.email,
      }
    }
  }));

  const serializedPartnershipFlights = partnershipFlights.map(f => ({
    id: f.id,
    partnershipAircraftId: f.partnershipAircraftId,
    aircraftRegistration: f.aircraftRegistration,
    aircraftType: f.aircraftType,
    durationMinutes: f.durationMinutes,
    takeoffPlace: f.takeoffPlace,
    arrivalPlace: f.arrivalPlace,
    hobbsStartMinutes: f.hobbsStartMinutes,
    hobbsEndMinutes: f.hobbsEndMinutes,
    passengerName: f.passengerName,
    instructorName: f.instructorName,
    instructorMinutes: f.instructorMinutes,
    engineOn: f.engineOn ? f.engineOn.toISOString() : null,
    engineOff: f.engineOff ? f.engineOff.toISOString() : null,
    totalCost: Number(f.totalCost),
    createdAt: f.createdAt.toISOString(),
    movement: {
      id: f.movement.id,
      userId: f.movement.userId,
      date: f.movement.date.toISOString(),
      notes: f.movement.notes,
      user: {
        id: f.movement.user.id,
        fullName: f.movement.user.fullName,
        email: f.movement.user.email,
      }
    }
  }));

  return (
    <AppShell
      title={partnership.name}
      titleAdornment={
        <Link href={"/societa?manage=true" as Route} className="muted" style={{ textDecoration: "none", whiteSpace: "nowrap" }}>
          ← Tutte le società
        </Link>
      }
      headerActions={
        <>
          <div id="partnership-tabs-slot" style={{ marginLeft: "auto" }} />
          <PartnershipSelector partnerships={userPartnerships} currentId={id} />
        </>
      }
    >
      <PartnershipTabs 
        partnership={serializedPartnership} 
        isAdmin={isAdmin} 
        currentUserId={user.id} 
        lastFlights={serializedLastFlights} 
        partnershipFlights={serializedPartnershipFlights}
        fuelStatus={fuelStatus}
        fuelLogs={serializedFuelLogs}
        editBookingId={typeof editBookingId === "string" ? editBookingId : undefined}
        tab={typeof tab === "string" ? tab : undefined}
        prefillAircraftId={typeof prefillAircraftId === "string" ? prefillAircraftId : undefined}
        prefillStartTime={typeof prefillStartTime === "string" ? prefillStartTime : undefined}
        prefillEndTime={typeof prefillEndTime === "string" ? prefillEndTime : undefined}
        prefillNotes={typeof prefillNotes === "string" ? prefillNotes : undefined}
      />
    </AppShell>
  );
}
