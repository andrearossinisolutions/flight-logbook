import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/require-user";
import { eur, formatDateInput } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { AirplaneIcon, TrashIcon } from "@/components/icons";

export default async function SettingsPage() {
  const user = await requireUser();
  const settings = user.settings;
  const rentalAircrafts = user.rentalAircrafts || [];

  async function addRentalAircraft(formData: FormData) {
    "use server";
    const user = await requireUser();
    const registration = String(formData.get("registration") || "").trim().toUpperCase();
    const type = String(formData.get("type") || "").trim() || "P92";
    const hourlyCost = Number(formData.get("hourlyCost") || 150);

    if (!registration) return;

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
        <div className="grid">
          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>I tuoi Aerei a Noleggio</h2>
            <p className="muted" style={{ fontSize: "0.9rem", marginTop: 0, marginBottom: 16 }}>
              Aggiungi gli aerei che noleggi (non in società) per applicare in automatico la loro specifica quota oraria.
            </p>

            {rentalAircrafts.length === 0 ? (
              <div className="muted" style={{ fontSize: "0.92rem", marginBottom: 16 }}>
                Nessun aereo configurato. Verrà usata la tariffa di fallback predefinita.
              </div>
            ) : (
              <div className="grid" style={{ gap: 12, marginBottom: 20 }}>
                {rentalAircrafts.map((a) => (
                  <div
                    key={a.id}
                    className="between"
                    style={{
                      background: "rgba(246, 248, 251, 0.8)",
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div className="row" style={{ gap: 10 }}>
                      <div
                        style={{
                          background: "white",
                          padding: 6,
                          borderRadius: 10,
                          display: "flex",
                          boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                        }}
                      >
                        <AirplaneIcon size={16} />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          {a.registration}
                        </div>
                        <div className="muted" style={{ fontSize: "0.8rem" }}>
                          {a.type} · {eur(Number(a.hourlyCost))}/h
                        </div>
                      </div>
                    </div>

                    <form action={deleteRentalAircraft}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="btn secondary icon-btn"
                        style={{ width: 34, height: 34, borderColor: "transparent", color: "var(--danger)" }}
                        title="Elimina aereo"
                      >
                        <TrashIcon size={16} />
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}

            <h3 style={{ fontSize: "1rem", marginTop: 0, marginBottom: 12 }}>Aggiungi aereo</h3>
            <form action={addRentalAircraft} className="grid">
              <div className="grid grid-2">
                <div className="field">
                  <label htmlFor="registration" style={{ fontSize: "0.85rem" }}>Marche</label>
                  <input
                    className="input"
                    id="registration"
                    name="registration"
                    required
                    placeholder="Es. I-4150"
                  />
                </div>
                <div className="field">
                  <label htmlFor="type" style={{ fontSize: "0.85rem" }}>Modello</label>
                  <input
                    className="input"
                    id="type"
                    name="type"
                    placeholder="Es. P92"
                  />
                </div>
              </div>
              <div className="field">
                <label htmlFor="hourlyCost" style={{ fontSize: "0.85rem" }}>Quota oraria noleggio (€/h)</label>
                <input
                  className="input"
                  id="hourlyCost"
                  name="hourlyCost"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={150}
                  required
                />
              </div>
              <button type="submit" className="btn" style={{ marginTop: 4 }}>
                Salva aereo
              </button>
            </form>
          </div>
        </div>

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
