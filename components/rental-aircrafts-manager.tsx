"use client";

import { useState } from "react";
import { AirplaneIcon, TrashIcon, PencilIcon } from "@/components/icons";
import { eur } from "@/lib/utils";

interface RentalAircraft {
  id: string;
  userId: string;
  registration: string;
  type: string;
  hourlyCost: number;
}

type RentalAircraftsManagerProps = {
  rentalAircrafts: RentalAircraft[];
  onSave: (formData: FormData) => Promise<void>;
  onDelete: (formData: FormData) => Promise<void>;
};

export default function RentalAircraftsManager({
  rentalAircrafts,
  onSave,
  onDelete,
}: RentalAircraftsManagerProps) {
  const [editingAircraft, setEditingAircraft] = useState<RentalAircraft | null>(null);
  const [registration, setRegistration] = useState("");
  const [type, setType] = useState("");
  const [hourlyCost, setHourlyCost] = useState("150");
  const [error, setError] = useState<string | null>(null);

  function handleEdit(a: RentalAircraft) {
    setError(null);
    setEditingAircraft(a);
    setRegistration(a.registration);
    setType(a.type);
    setHourlyCost(String(a.hourlyCost));
  }

  function handleCancel() {
    setError(null);
    setEditingAircraft(null);
    setRegistration("");
    setType("");
    setHourlyCost("150");
  }

  async function handleSubmit(formData: FormData) {
    setError(null);
    try {
      await onSave(formData);
      handleCancel();
    } catch (err: any) {
      setError(err?.message || "Si è verificato un errore durante il salvataggio.");
    }
  }

  return (
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
                      {a.type} · {eur(a.hourlyCost)}/h
                    </div>
                  </div>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  <button
                    type="button"
                    className="btn secondary icon-btn"
                    style={{ width: 34, height: 34, borderColor: "transparent" }}
                    title="Modifica aereo"
                    onClick={() => handleEdit(a)}
                  >
                    <PencilIcon size={16} />
                  </button>
                  <form action={onDelete}>
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
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: "1rem", marginTop: 0, marginBottom: 12 }}>
          {editingAircraft ? `Modifica aereo: ${editingAircraft.registration}` : "Aggiungi aereo"}
        </h3>

        {error && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid var(--danger)",
              color: "var(--danger)",
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: "0.85rem",
              marginBottom: 12,
            }}
          >
            {error}
          </div>
        )}

        <form action={handleSubmit} className="grid">
          {editingAircraft && (
            <input type="hidden" name="id" value={editingAircraft.id} />
          )}
          <div className="grid grid-2">
            <div className="field">
              <label htmlFor="registration" style={{ fontSize: "0.85rem" }}>Marche</label>
              <input
                className="input"
                id="registration"
                name="registration"
                required
                placeholder="Es. I-4150"
                value={registration}
                onChange={(e) => setRegistration(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="type" style={{ fontSize: "0.85rem" }}>Modello</label>
              <input
                className="input"
                id="type"
                name="type"
                placeholder="Es. P92"
                value={type}
                onChange={(e) => setType(e.target.value)}
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
              required
              value={hourlyCost}
              onChange={(e) => setHourlyCost(e.target.value)}
            />
          </div>
          <div className="row" style={{ gap: 12, marginTop: 4 }}>
            <button type="submit" className="btn" style={{ flex: 1 }}>
              {editingAircraft ? "Salva modifiche" : "Salva aereo"}
            </button>
            {editingAircraft && (
              <button
                type="button"
                className="btn secondary"
                onClick={handleCancel}
              >
                Annulla
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
