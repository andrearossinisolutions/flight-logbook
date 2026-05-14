import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Route } from "next";

export default async function SocietaPage() {
  const user = await requireUser();

  const memberships = await prisma.partnershipMember.findMany({
    where: { userId: user.id },
    include: {
      partnership: {
        include: {
          members: true,
          aircrafts: true,
        }
      }
    }
  });

  async function createPartnership(formData: FormData) {
    "use server";
    const user = await requireUser();
    const name = String(formData.get("name") || "").trim();

    if (!name) return;

    const newPartnership = await prisma.$transaction(async (tx) => {
      const p = await tx.partnership.create({
        data: { name }
      });
      await tx.partnershipMember.create({
        data: {
          partnershipId: p.id,
          userId: user.id,
          role: "ADMIN"
        }
      });
      return p;
    });

    redirect(`/societa/${newPartnership.id}` as Route);
  }

  return (
    <AppShell title="Gestione Società" subtitle="Gestisci gli aerei in società, i costi fissi e i rendiconti mensili.">
      <div className="grid grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Le tue Società</h2>

          {memberships.length === 0 ? (
            <div className="muted">Non fai ancora parte di nessuna società.</div>
          ) : (
            <div className="grid" style={{ gap: 16 }}>
              {memberships.map((m) => (
                <div key={m.partnershipId} className="card" style={{ padding: 16, background: "var(--bg-secondary)" }}>
                  <div className="between">
                    <div>
                      <h3 style={{ margin: 0 }}>{m.partnership.name}</h3>
                      <div className="muted" style={{ fontSize: 14, marginTop: 4 }}>
                        {m.partnership.members.length > 1 ? `${m.partnership.members.length} soci` : "1 socio"} · {m.partnership.aircrafts.length > 1 ? `${m.partnership.aircrafts.length} aerei` : "1 aereo"}
                      </div>
                    </div>
                    <Link href={`/societa/${m.partnershipId}` as Route} className="btn">
                      Gestisci
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0 }}>Crea nuova Società</h2>
          <form action={createPartnership} className="grid">
            <div className="field">
              <label htmlFor="name">Nome Società</label>
              <input
                className="input"
                id="name"
                name="name"
                required
                placeholder="Es. P92 Club"
              />
            </div>
            <button type="submit" className="btn">Crea Società</button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
