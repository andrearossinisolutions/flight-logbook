import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";

export default async function NewTopupPage() {
  await requireUser();

  async function createTopup(formData: FormData) {
    "use server";

    const user = await requireUser();

    const dateRaw = String(formData.get("date") ?? "");
    const amountRaw = String(formData.get("amount") ?? "");
    const notesRaw = String(formData.get("notes") ?? "");

    const amount = Number(amountRaw);

    if (!dateRaw) {
      throw new Error("La data è obbligatoria.");
    }

    if (!Number.isFinite(amount) || amount === 0) {
      throw new Error("L'importo deve essere diverso da zero.");
    }

    await prisma.movement.create({
      data: {
        userId: user.id,
        type: "TOPUP",
        date: new Date(dateRaw),
        amount,
        notes: notesRaw.trim() || null,
      },
    });

    revalidatePath("/dashboard");
    redirect("/dashboard");
  }

  return (
    <AppShell
      title="Nuovo movimento saldo"
      subtitle="Usa un importo positivo per una ricarica, negativo per una rettifica/addebito."
    >
      <div className="card" style={{ maxWidth: 720 }}>
        <form action={createTopup} className="stack">
          <div>
            <label className="label" htmlFor="date">
              Data
            </label>
            <input
              id="date"
              name="date"
              type="date"
              className="input"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </div>

          <div>
            <label className="label" htmlFor="amount">
              Importo
            </label>
            <input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              className="input"
              placeholder="Es. 200 oppure -35"
              required
            />
            <div className="muted" style={{ marginTop: 6 }}>
              Positivo = ricarica / credito. Negativo = rettifica o addebito manuale.
            </div>
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Note
            </label>
            <textarea
              id="notes"
              name="notes"
              className="input"
              rows={4}
              placeholder="Esempio: Allineamento saldo con aeroclub"
            />
          </div>

          <div className="row" style={{ gap: 12 }}>
            <button type="submit" className="btn">
              Salva
            </button>
            <Link href="/dashboard" className="btn secondary">
              Annulla
            </Link>
          </div>
        </form>
      </div>
    </AppShell>
  );
}