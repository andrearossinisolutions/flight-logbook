import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { formatDateInput } from "@/lib/utils";

export default async function NewTopupPage() {
  await requireUser();

  return (
    <AppShell title="Nuova ricarica" subtitle="Aggiunge credito al saldo.">
      <div className="card" style={{ maxWidth: 720 }}>
        <form action="/api/movements/topup" method="post" className="grid">
          <div className="field">
            <label htmlFor="date">Data</label>
            <input className="input" id="date" name="date" type="date" defaultValue={formatDateInput(new Date())} required />
          </div>
          <div className="field">
            <label htmlFor="amount">Importo (€)</label>
            <input className="input" id="amount" name="amount" type="number" min="0" step="0.01" required />
          </div>
          <div className="field">
            <label htmlFor="notes">Note</label>
            <textarea className="textarea" id="notes" name="notes" />
          </div>
          <button className="btn" type="submit">Salva ricarica</button>
        </form>
      </div>
    </AppShell>
  );
}
