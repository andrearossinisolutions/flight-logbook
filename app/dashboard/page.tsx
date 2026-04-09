import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { eur, formatDateDisplay, minutesToHoursMinutes } from "@/lib/utils";

export default async function DashboardPage() {
  const user = await requireUser();
  const settings = user.settings;

  const movements = await (await import("@/lib/prisma")).prisma.movement.findMany({
    where: { userId: user.id },
    include: { flight: true },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
  });

  const saldo = movements.reduce((acc, item) => acc + Number(item.amount), 0);
  const totalFlightMinutes = movements.reduce((acc, item) => acc + (item.flight?.durationMinutes ?? 0), 0);
  const totalFlightCost = movements
    .filter((item) => item.type === "FLIGHT")
    .reduce((acc, item) => acc + Math.abs(Number(item.amount)), 0);

  return (
    <AppShell
      title={`Ciao${user.fullName ? `, ${user.fullName}` : ""}`}
      subtitle="Saldo, movimenti e accesso rapido a inserimento volo, ricarica e settings."
    >
      <div className="summary-grid" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="muted">Saldo attuale</div>
          <div className="big-number">{eur(saldo)}</div>
        </div>
        <div className="card">
          <div className="muted">Ore volate registrate</div>
          <div className="big-number">{minutesToHoursMinutes(totalFlightMinutes)}</div>
        </div>
        <div className="card">
          <div className="muted">Spesa voli</div>
          <div className="big-number">{eur(totalFlightCost)}</div>
        </div>
        <div className="card">
          <div className="muted">Tariffe correnti</div>
          <div style={{ fontWeight: 700, marginTop: 8 }}>
            P92: {eur(Number(settings?.rentalRatePerHour ?? 150))}/h
          </div>
          <div style={{ fontWeight: 700, marginTop: 4 }}>
            Istruttore: {eur(Number(settings?.instructorRatePerHour ?? 80))}/h
          </div>
        </div>
      </div>

      <div className="between" style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Registro movimenti</h2>
        <div className="row">
          <Link className="btn" href="/new-flight">Nuovo volo</Link>
          <Link className="btn secondary" href="/new-topup">Nuova ricarica</Link>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Dettagli</th>
              <th>Importo</th>
            </tr>
          </thead>
          <tbody>
            {movements.length === 0 ? (
              <tr>
                <td colSpan={4} className="muted">Nessun movimento inserito.</td>
              </tr>
            ) : null}
            {movements.map((item) => (
              <tr key={item.id}>
                <td>{formatDateDisplay(item.date)}</td>
                <td>{item.type === "TOPUP" ? "Ricarica" : "Volo"}</td>
                <td>
                  {item.type === "TOPUP" ? (
                    <div>
                      <div>Credito aggiunto</div>
                      {item.notes ? <div className="muted">{item.notes}</div> : null}
                    </div>
                  ) : (
                    <div>
                      <div>
                        {item.flight?.aircraft ?? "P92"} · {minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}
                      </div>
                      <div className="muted">
                        {item.flight?.instructorName
                          ? `Istruttore: ${item.flight.instructorName}`
                          : "Senza istruttore"}
                      </div>
                      {item.notes ? <div className="muted">{item.notes}</div> : null}
                    </div>
                  )}
                </td>
                <td style={{ fontWeight: 700 }}>{eur(Number(item.amount))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
