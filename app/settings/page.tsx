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
            <label htmlFor="dateMonoExam">Data visita medica</label>

            <input
              className="input"
              id="dateMedicalExam"
              name="dateMedicalExam"
              type="date"
              defaultValue={formatDateInput(settings?.dateMedicalExam ? new Date(settings.dateMedicalExam) : new Date())}
              max={formatDateInput(new Date())}
              required
            />
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

          <div className="field">
            <label htmlFor="dateMonoExam">Data esame biposto</label>

            <input
              className="input"
              id="dateBipoExam"
              name="dateBipoExam"
              type="date"
              defaultValue={settings?.dateBipoExam ? formatDateInput(new Date(settings.dateBipoExam)) : undefined}
              max={formatDateInput(new Date())}
            />
          </div>

          <div className="field">
            <label htmlFor="dateFoniaExam">Data esame fonia</label>

            <input
              className="input"
              id="dateFoniaExam"
              name="dateFoniaExam"
              type="date"
              defaultValue={settings?.dateFoniaExam ? formatDateInput(new Date(settings.dateFoniaExam)) : undefined}
              max={formatDateInput(new Date())}
            />
          </div>

          <div className="field">
            <label htmlFor="dateAdvanced">Data esame avanzato</label>

            <input
              className="input"
              id="dateAdvanced"
              name="dateAdvanced"
              type="date"
              defaultValue={settings?.dateAdvanced ? formatDateInput(new Date(settings.dateAdvanced)) : undefined}
              max={formatDateInput(new Date())}
            />
          </div>

          <button className="btn" type="submit">Salva impostazioni</button>
        </form>
      </div>
    </AppShell>
  );
}
