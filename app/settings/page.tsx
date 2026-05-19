import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { formatDateInput } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import RentalAircraftsManager from "@/components/rental-aircrafts-manager";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = user.settings;
  const rentalAircrafts = (user.rentalAircrafts || []).map((a) => ({
    id: a.id,
    userId: a.userId,
    registration: a.registration,
    type: a.type,
    hourlyCost: Number(a.hourlyCost),
  }));

  async function saveRentalAircraft(formData: FormData) {
    "use server";
    const user = await requireUser();
    const id = formData.get("id") ? String(formData.get("id")) : null;
    const registration = String(formData.get("registration") || "").trim().toUpperCase();
    const type = String(formData.get("type") || "").trim() || "P92";
    const hourlyCost = Number(formData.get("hourlyCost") || 150);

    if (!registration) return;

    if (id) {
      const existing = await prisma.rentalAircraft.findFirst({
        where: {
          userId: user.id,
          registration,
          NOT: {
            id,
          },
        },
      });

      if (existing) {
        throw new Error("Esiste già un aereo a noleggio con queste marche.");
      }

      await prisma.rentalAircraft.update({
        where: {
          id,
          userId: user.id,
        },
        data: {
          registration,
          type,
          hourlyCost,
        },
      });
    } else {
      await prisma.rentalAircraft.upsert({
        where: {
          userId_registration: {
            userId: user.id,
            registration,
          },
        },
        update: {
          type,
          hourlyCost,
        },
        create: {
          userId: user.id,
          registration,
          type,
          hourlyCost,
        },
      });
    }

    revalidatePath("/settings");
  }

  async function deleteRentalAircraft(formData: FormData) {
    "use server";
    const user = await requireUser();
    const id = String(formData.get("id") || "");

    if (!id) return;

    await prisma.rentalAircraft.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    revalidatePath("/settings");
  }

  return (
    <AppShell
      title="Impostazioni e Aerei"
      subtitle="Configura i tuoi aerei a noleggio e le tariffe orarie per i nuovi voli."
    >
      <div className="grid grid-2" style={{ alignItems: "flex-start" }}>
        {/* Sezione Aerei a Noleggio Personali */}
        <RentalAircraftsManager
          rentalAircrafts={rentalAircrafts}
          onSave={saveRentalAircraft}
          onDelete={deleteRentalAircraft}
        />

        {/* Impostazioni Generali Fallback */}
        <div className="card">
          <h2 style={{ marginTop: 0, marginBottom: 16 }}>Impostazioni Generali</h2>
          <form action="/api/settings" method="post" className="grid">
            <div className="field">
              <label htmlFor="rentalRatePerHour">Tariffa noleggio predefinita di fallback (€ / h)</label>
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
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                Applicata se inserisci un volo con marche non configurate.
              </span>
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
              <input
                className="input"
                id="currency"
                name="currency"
                defaultValue={settings?.currency ?? "EUR"}
                maxLength={3}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="defaultBase">Base predefinita</label>
              <input
                className="input"
                id="defaultBase"
                name="defaultBase"
                defaultValue={settings?.defaultBase ?? ""}
                placeholder="Es. Alzate Brianza"
                maxLength={100}
              />
            </div>

            <div className="field">
              <label htmlFor="dateMedicalExam">Data visita medica</label>
              <input
                className="input"
                id="dateMedicalExam"
                name="dateMedicalExam"
                type="date"
                defaultValue={formatDateInput(
                  settings?.dateMedicalExam ? new Date(settings.dateMedicalExam) : new Date()
                )}
                max={formatDateInput(new Date())}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="dateMonoExam">Data attestato</label>
              <input
                className="input"
                id="dateMonoExam"
                name="dateMonoExam"
                type="date"
                defaultValue={
                  settings?.dateMonoExam ? formatDateInput(new Date(settings.dateMonoExam)) : undefined
                }
                max={formatDateInput(new Date())}
              />
            </div>

            <div className="field">
              <label htmlFor="dateBipoExam">Data abilitazione passeggero</label>
              <input
                className="input"
                id="dateBipoExam"
                name="dateBipoExam"
                type="date"
                defaultValue={
                  settings?.dateBipoExam ? formatDateInput(new Date(settings.dateBipoExam)) : undefined
                }
                max={formatDateInput(new Date())}
              />
            </div>

            <div className="field">
              <label htmlFor="dateFoniaExam">Data abilitazione fonia</label>
              <input
                className="input"
                id="dateFoniaExam"
                name="dateFoniaExam"
                type="date"
                defaultValue={
                  settings?.dateFoniaExam ? formatDateInput(new Date(settings.dateFoniaExam)) : undefined
                }
                max={formatDateInput(new Date())}
              />
            </div>

            <div className="field">
              <label htmlFor="dateAdvanced">Data abilitazione avanzato</label>
              <input
                className="input"
                id="dateAdvanced"
                name="dateAdvanced"
                type="date"
                defaultValue={
                  settings?.dateAdvanced ? formatDateInput(new Date(settings.dateAdvanced)) : undefined
                }
                max={formatDateInput(new Date())}
              />
            </div>

            <button className="btn" type="submit" style={{ marginTop: 8 }}>
              Salva impostazioni
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
