import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { formatDateInput } from "@/lib/utils";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = user.settings;

  return (
    <AppShell title="Settings" subtitle="Tariffe orarie modificabili per i nuovi voli.">
      <div className="card" style={{ maxWidth: 720 }}>
        <form action="/api/settings" method="post" className="grid">
          <div className="field">
            <label htmlFor="rentalRatePerHour">Tariffa noleggio oraria (€ / h)</label>
            <input
              className="input"
              id="rentalRatePerHour"
              name="rentalRatePerHour"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(settings?.rentalRatePerHour ?? 150)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="instructorRatePerHour">Tariffa istruttore oraria (€ / h)</label>
            <input
              className="input"
              id="instructorRatePerHour"
              name="instructorRatePerHour"
              type="number"
              step="0.01"
              min="0"
              defaultValue={Number(settings?.instructorRatePerHour ?? 80)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="currency">Valuta</label>
            <input className="input" id="currency" name="currency" defaultValue={settings?.currency ?? "EUR"} maxLength={3} required />
          </div>

          <div className="field">
            <label htmlFor="dateMonoExam">Data esame monoposto</label>

            <input
              className="input"
              id="dateMonoExam"
              name="dateMonoExam"
              type="date"
              defaultValue={settings?.dateMonoExam ? formatDateInput(new Date(settings.dateMonoExam)) : undefined}
              max={formatDateInput(new Date())}
            />
          </div>

          <button className="btn" type="submit">Salva impostazioni</button>
        </form>
      </div>
    </AppShell>
  );
}
