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
    }
  });

  if (!partnership) {
    redirect("/societa" as Route);
  }

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
    }))
  };

  return (
    <AppShell title={partnership.name} subtitle="Gestione società">
      <div style={{ marginBottom: 24 }}>
        <Link href={"/societa" as Route} className="muted" style={{ textDecoration: "none" }}>
          ← Torna alle società
        </Link>
      </div>

      <PartnershipTabs partnership={serializedPartnership} isAdmin={isAdmin} currentUserId={user.id} />
    </AppShell>
  );
}
