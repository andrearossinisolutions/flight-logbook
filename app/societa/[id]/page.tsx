import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Route } from "next";
import { PartnershipTabs } from "./tabs";

export default async function SocietaDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const partnership = await prisma.partnership.findFirst({
    where: {
      id,
      members: { some: { userId: user.id } }
    },
    include: {
      members: {
        include: { user: true }
      },
      aircrafts: true,
      fixedCosts: true,
      transactions: {
        include: { user: true },
        orderBy: { date: 'desc' }
      },
      invitations: true,
      messages: {
        include: { user: true },
        orderBy: { createdAt: 'desc' }
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

  const isAdmin = partnership.members.find(m => m.userId === user.id)?.role === "ADMIN";

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
    aircrafts: partnership.aircrafts.map(a => ({
      ...a,
      hourlyFuelCost: Number(a.hourlyFuelCost),
      hourlyMaintCost: Number(a.hourlyMaintCost),
      hourlyEngineFund: Number(a.hourlyEngineFund),
    })),
    fixedCosts: partnership.fixedCosts.map(c => ({
      ...c,
      amount: Number(c.amount),
    })),
    transactions: partnership.transactions.map(t => ({
      ...t,
      amount: Number(t.amount),
      date: t.date.toISOString(),
      user: t.user ? { fullName: t.user.fullName, email: t.user.email } : null,
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
    }))
  };

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
    <AppShell title={partnership.name} subtitle="Gestione società">
      <div style={{ marginBottom: 24 }}>
        <Link href={"/societa" as Route} className="muted" style={{ textDecoration: "none" }}>
          ← Torna alle società
        </Link>
      </div>

      <PartnershipTabs 
        partnership={serializedPartnership} 
        isAdmin={isAdmin} 
        currentUserId={user.id} 
        lastFlights={serializedLastFlights} 
      />
    </AppShell>
  );
}
