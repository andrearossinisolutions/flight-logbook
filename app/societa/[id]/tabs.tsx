"use client";

import { useState, useEffect } from "react";
import { addAircraft, addFixedCost, addMember, getMonthlyReport, deleteAircraft, deleteFixedCost, removeMember, updateAircraft, updateFixedCost, addTransaction, deleteTransaction, updatePartnershipName, deletePartnership, cancelInvitation, addMessage, deleteMessage } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateDisplay, daysFromDate } from "@/lib/utils";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m < 10 ? '0' : ''}${m}`;
}

function formatMonth(monthNum: number | null | undefined): string {
  if (!monthNum) return "";
  const months = [
    "gennaio", "febbraio", "marzo", "aprile", "maggio", "giugno",
    "luglio", "agosto", "settembre", "ottobre", "novembre", "dicembre"
  ];
  return months[monthNum - 1] || "";
}

export function PartnershipTabs({ partnership, isAdmin, currentUserId, lastFlights = [] }: any) {
  const [activeTab, setActiveTab] = useState("BACHECA");

  // Edit state
  const [editingAircraftId, setEditingAircraftId] = useState<string | null>(null);
  const [editingFixedCostId, setEditingFixedCostId] = useState<string | null>(null);
  const [editingFixedCostPeriod, setEditingFixedCostPeriod] = useState("MONTHLY");
  const [editingFixedCostYear, setEditingFixedCostYear] = useState<string>(new Date().getFullYear().toString());
  const [newFixedCostPeriod, setNewFixedCostPeriod] = useState("MONTHLY");
  const [newFixedCostYear, setNewFixedCostYear] = useState<string>(new Date().getFullYear().toString());
  const [roundingTarget, setRoundingTarget] = useState("");

  // Report state
  const [reportMonth, setReportMonth] = useState(new Date().getMonth());
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState<any>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  useEffect(() => {
    if (activeTab === "REPORT") {
      loadReport();
    }
  }, [activeTab, reportMonth, reportYear]);

  async function loadReport() {
    setIsLoadingReport(true);
    try {
      const data = await getMonthlyReport(partnership.id, reportYear, reportMonth);
      setReportData(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingReport(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 24 }}>
        <div className="navbar-tabs" style={{ display: "flex", flexWrap: "wrap", width: "fit-content" }}>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "BACHECA" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "BACHECA" ? "white" : "transparent" }}
            onClick={() => setActiveTab("BACHECA")}
          >
            Bacheca
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "AIRCRAFTS" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "AIRCRAFTS" ? "white" : "transparent" }}
            onClick={() => setActiveTab("AIRCRAFTS")}
          >
            Aerei e Costi
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "MEMBERS" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "MEMBERS" ? "white" : "transparent" }}
            onClick={() => setActiveTab("MEMBERS")}
          >
            Soci
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "REPORT" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "REPORT" ? "white" : "transparent" }}
            onClick={() => setActiveTab("REPORT")}
          >
            Rendiconto Mensile
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "CASSA" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "CASSA" ? "white" : "transparent" }}
            onClick={() => setActiveTab("CASSA")}
          >
            Cassa
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`navbar-tab ${activeTab === "SETTINGS" ? "active" : ""}`}
              style={{ border: "none", cursor: "pointer", background: activeTab === "SETTINGS" ? "white" : "transparent" }}
              onClick={() => setActiveTab("SETTINGS")}
            >
              Impostazioni
            </button>
          )}
        </div>
      </div>

      {activeTab === "BACHECA" && (
        <div className="bacheca-layout">
          {/* Colonna Sinistra: Ultimi Utilizzi / Statistiche */}
          <div className="bacheca-sidebar">
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 16, height: "fit-content" }}>
              <div>
              <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.25rem", display: "flex", alignItems: "center", gap: 8 }}>
                ✈️ Ultimi utilizzi
              </h2>
              <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
                Ultimi 3 voli registrati dagli aerei societari.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {lastFlights.length === 0 ? (
                <div className="muted" style={{ 
                  padding: 20, 
                  border: "1px dashed var(--border)", 
                  borderRadius: 16,
                  textAlign: "center",
                  fontSize: "0.95rem"
                }}>
                  Nessun volo registrato di recente.
                </div>
              ) : (
                lastFlights.map((flight: any) => (
                  <div key={flight.id} style={{
                    background: "var(--bg, #f6f8fb)",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    transition: "transform 0.2s, box-shadow 0.2s",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(20, 32, 51, 0.06)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}>
                    <div>
                      <div className="between" style={{ marginBottom: 12 }}>
                        <span className="pill">
                          {flight.aircraftRegistration}
                        </span>
                        <span className="muted" style={{ fontSize: "0.8rem", fontWeight: 500 }} title={formatDateDisplay(flight.movement.date)}>
                          {daysFromDate(flight.movement.date)}
                        </span>
                      </div>
                      
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text)", marginBottom: 4 }}>
                        {flight.movement.user.fullName || flight.movement.user.email}
                      </div>
                      
                      <div style={{ fontSize: "0.85rem", color: "var(--muted)", marginBottom: 8, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                        <span>📍 {flight.takeoffPlace || "?"} ➔ {flight.arrivalPlace || "?"}</span>
                        <span style={{ color: "var(--border)" }}>•</span>
                        <span>⏱️ {formatMinutes(flight.durationMinutes)}</span>
                        {flight.hobbsStartMinutes !== null && flight.hobbsEndMinutes !== null && (
                          <>
                            <span style={{ color: "var(--border)" }}>•</span>
                            <span>Oram.: {(flight.hobbsStartMinutes / 60).toFixed(1)} ➔ {(flight.hobbsEndMinutes / 60).toFixed(1)}</span>
                          </>
                        )}
                      </div>

                      {(flight.instructorName || flight.passengerName) && (
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginBottom: 8 }}>
                          {flight.instructorName ? `👨‍✈️ Istr. ${flight.instructorName}` : `👤 Pass. ${flight.passengerName}`}
                        </div>
                      )}
                    </div>

                    {flight.movement.notes && (
                      <div style={{ 
                        fontSize: "0.8rem", 
                        fontStyle: "italic", 
                        color: "var(--muted)",
                        borderLeft: "2px solid var(--primary)",
                        paddingLeft: 8,
                        marginTop: 4,
                        wordBreak: "break-word"
                      }}>
                        "{flight.movement.notes}"
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

          {/* Colonna Destra: Bacheca Messaggi */}
          <div className="bacheca-content">
            <div className="card">
              <div>
              <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: "1.25rem" }}>Bacheca Messaggi</h2>
              <p className="muted" style={{ margin: "0 0 20px 0", fontSize: "0.9rem" }}>
                Messaggi e comunicazioni tra i soci.
              </p>
            </div>
            
            <form action={async (fd) => {
              const form = document.getElementById("message-form") as HTMLFormElement;
              await addMessage(partnership.id, fd);
              form?.reset();
            }} id="message-form" style={{ marginBottom: 24 }}>
              <div className="field">
                <textarea 
                  name="content" 
                  className="textarea" 
                  placeholder="Scrivi un messaggio a tutti i soci..."
                  required
                  style={{ minHeight: 80 }}
                />
              </div>
              <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                <SubmitButton>Invia messaggio</SubmitButton>
              </div>
            </form>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {partnership.messages?.length === 0 ? (
                <div className="muted" style={{ textAlign: "center", padding: "40px 0" }}>Nessun messaggio in bacheca. Rompi il ghiaccio!</div>
              ) : (
                partnership.messages?.map((msg: any) => (
                  <div key={msg.id} style={{
                    background: msg.userId === currentUserId ? "var(--bg)" : "white",
                    border: "1px solid var(--border)",
                    borderRadius: 16,
                    padding: 16,
                    position: "relative"
                  }}>
                    <div className="between" style={{ marginBottom: 8 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--primary-strong)" }}>
                        {msg.user?.fullName || msg.user?.email || "Utente"}
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <div className="muted" style={{ fontSize: "0.85rem" }}>
                          {new Date(msg.createdAt).toLocaleString("it-IT", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                          })}
                        </div>
                        {(msg.userId === currentUserId || isAdmin) && (
                          <form 
                            action={deleteMessage.bind(null, partnership.id, msg.id)} 
                            style={{ opacity: 0.5, transition: "opacity 0.2s" }} 
                            onMouseEnter={(e) => e.currentTarget.style.opacity = "1"} 
                            onMouseLeave={(e) => e.currentTarget.style.opacity = "0.5"}
                            onSubmit={(e) => {
                              if (!window.confirm("Sei sicuro di voler eliminare questo messaggio?")) {
                                e.preventDefault();
                              }
                            }}
                          >
                            <button type="submit" className="icon-btn" style={{ background: "transparent", border: "none", color: "var(--danger)", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0, margin: 0 }} title="Elimina">
                              ✕
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5, fontSize: "0.95rem" }}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )}

      {activeTab === "AIRCRAFTS" && (
        <div className="grid grid-2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Aerei della Società</h2>
            {partnership.aircrafts.length === 0 ? (
              <div className="muted">Nessun aereo inserito.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Marche</th>
                    <th>Tipo</th>
                    <th>Costo orario</th>
                    {isAdmin && <th>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {partnership.aircrafts.map((a: any) => {
                    const isEditing = editingAircraftId === a.id;
                    return (
                      <tr key={a.id}>
                        {isEditing ? (
                          <td colSpan={isAdmin ? 4 : 3} style={{ padding: "16px" }}>
                            <form action={async (fd) => {
                              await updateAircraft(partnership.id, a.id, fd);
                              setEditingAircraftId(null);
                            }} className="grid" style={{ gap: 16, backgroundColor: "var(--bg-card-hover)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Modifica Aereo: <strong>{a.registration}</strong></span>
                              </div>
                              
                              <div className="grid grid-2" style={{ gap: 16 }}>
                                <div className="field">
                                  <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Marche</label>
                                  <input className="input" name="registration" defaultValue={a.registration} required />
                                </div>
                                <div className="field">
                                  <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Tipo</label>
                                  <input className="input" name="type" defaultValue={a.type} required />
                                </div>
                              </div>

                              <div style={{ marginTop: "8px" }}>
                                <label style={{ fontWeight: 600, color: "var(--muted)", display: "block", marginBottom: "12px" }}>
                                  Costi per ora di volo dovuti alla società (€/h)
                                </label>
                                <div className="grid grid-3" style={{ gap: 16 }}>
                                  <div className="field">
                                    <label style={{ fontSize: "0.8rem", marginBottom: "4px", display: "block" }}>Benzina</label>
                                    <input className="input" name="hourlyFuelCost" type="number" step="0.01" min="0" defaultValue={a.hourlyFuelCost} required />
                                  </div>
                                  <div className="field">
                                    <label style={{ fontSize: "0.8rem", marginBottom: "4px", display: "block" }}>Manutenzione</label>
                                    <input className="input" name="hourlyMaintCost" type="number" step="0.01" min="0" defaultValue={a.hourlyMaintCost} required />
                                  </div>
                                  <div className="field">
                                    <label style={{ fontSize: "0.8rem", marginBottom: "4px", display: "block" }}>Fondo Motore</label>
                                    <input className="input" name="hourlyEngineFund" type="number" step="0.01" min="0" defaultValue={a.hourlyEngineFund} required />
                                  </div>
                                </div>
                              </div>

                              <div className="row" style={{ justifyContent: "flex-end", gap: 12, marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                                <button className="btn secondary" type="button" onClick={() => setEditingAircraftId(null)}>
                                  Annulla
                                </button>
                                <SubmitButton>Salva</SubmitButton>
                              </div>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td><strong>{a.registration}</strong></td>
                            <td>{a.type}</td>
                            <td>€ {(a.hourlyFuelCost + a.hourlyMaintCost + a.hourlyEngineFund).toFixed(2)} / h</td>
                            {isAdmin && (
                              <td>
                                <div className="row" style={{ gap: 8 }}>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: "4px 8px", fontSize: 12 }}
                                    onClick={() => setEditingAircraftId(a.id)}
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                                    onClick={() => {
                                      if (confirm(`Sei sicuro di voler eliminare l'aereo ${a.registration}?`)) {
                                        deleteAircraft(partnership.id, a.id);
                                      }
                                    }}
                                  >
                                    Elimina
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {isAdmin && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                <h3 style={{ marginTop: 0 }}>Aggiungi aereo</h3>
                <form action={addAircraft.bind(null, partnership.id)} className="grid">
                  <div className="grid grid-2">
                    <div className="field">
                      <label>Marche</label>
                      <input className="input" name="registration" required placeholder="Es. I-4150" />
                    </div>
                    <div className="field">
                      <label>Tipo</label>
                      <input className="input" name="type" required placeholder="Es. P92" />
                    </div>
                  </div>
                  <div className="grid grid-3">
                    <label style={{ fontWeight: 600, color: "var(--muted)", display: "block", marginTop: "12px" }}>
                      Costi per ora di volo dovuti alla società (€/h)
                    </label>
                    <div className="field">
                      <label>Benzina (€/h)</label>
                      <input className="input" name="hourlyFuelCost" type="number" step="0.01" min="0" required />
                    </div>
                    <div className="field">
                      <label>Manutenzione (€/h)</label>
                      <input className="input" name="hourlyMaintCost" type="number" step="0.01" min="0" required />
                    </div>
                    <div className="field">
                      <label>Fondo motore (€/h)</label>
                      <input className="input" name="hourlyEngineFund" type="number" step="0.01" min="0" required />
                    </div>
                  </div>
                  <SubmitButton>Aggiungi aereo</SubmitButton>
                </form>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Costi Fissi</h2>
            {partnership.fixedCosts.length === 0 ? (
              <div className="muted">Nessun costo fisso inserito.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrizione</th>
                    <th>Importo</th>
                    {isAdmin && <th>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {partnership.fixedCosts.map((c: any) => {
                    const isEditing = editingFixedCostId === c.id;
                    return (
                      <tr key={c.id}>
                        {isEditing ? (
                          <td colSpan={isAdmin ? 3 : 2} style={{ padding: "16px" }}>
                            <form action={async (fd) => {
                              await updateFixedCost(partnership.id, c.id, fd);
                              setEditingFixedCostId(null);
                            }} className="grid" style={{ gap: 16, backgroundColor: "var(--bg-card-hover)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border)" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "4px" }}>
                                <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Modifica Costo Fisso: <strong>{c.description}</strong></span>
                              </div>
                              
                              <div className="grid grid-2" style={{ gap: 16 }}>
                                <div className="field">
                                  <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Descrizione</label>
                                  <input className="input" name="description" defaultValue={c.description} required />
                                </div>
                                <div className="field">
                                  <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Periodicità</label>
                                  <select className="select" name="period" value={editingFixedCostPeriod} onChange={(e) => {
                                      setEditingFixedCostPeriod(e.target.value);
                                      if (e.target.value !== "ONE_OFF") {
                                        setEditingFixedCostYear(new Date().getFullYear().toString());
                                      }
                                    }}>
                                    <option value="MONTHLY">Mensile</option>
                                    <option value="YEARLY_PRORATED">Annuale diviso per mese</option>
                                    <option value="YEARLY_ONCE">Annuale ogni 12 mesi</option>
                                    <option value="ONE_OFF">Una tantum</option>
                                  </select>
                                </div>
                              </div>

                              {(editingFixedCostPeriod === "YEARLY_ONCE" || editingFixedCostPeriod === "ONE_OFF") && (
                                <div className="grid grid-2" style={{ gap: 16 }}>
                                  <div className="field">
                                    <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Mese di addebito</label>
                                    <select className="select" name="billingMonth" defaultValue={c.billingMonth || 1}>
                                      <option value="1">Gennaio</option>
                                      <option value="2">Febbraio</option>
                                      <option value="3">Marzo</option>
                                      <option value="4">Aprile</option>
                                      <option value="5">Maggio</option>
                                      <option value="6">Giugno</option>
                                      <option value="7">Luglio</option>
                                      <option value="8">Agosto</option>
                                      <option value="9">Settembre</option>
                                      <option value="10">Ottobre</option>
                                      <option value="11">Novembre</option>
                                      <option value="12">Dicembre</option>
                                    </select>
                                  </div>
                                  {editingFixedCostPeriod === "ONE_OFF" && (
                                    <div className="field">
                                      <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Anno di addebito</label>
                                      <input className="input" name="billingYear" type="number" min="2020" max="2100" defaultValue={c.billingYear || new Date().getFullYear()} required />
                                    </div>
                                  )}
                                </div>
                              )}

                              <div className="field" style={{ maxWidth: "250px" }}>
                                <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Importo (€)</label>
                                <input className="input" name="amount" type="number" step="0.01" min="0" defaultValue={c.amount} required />
                              </div>

                              <div className="row" style={{ justifyContent: "flex-end", gap: 12, marginTop: "8px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}>
                                <button className="btn secondary" type="button" onClick={() => setEditingFixedCostId(null)}>
                                  Annulla
                                </button>
                                <SubmitButton>Salva</SubmitButton>
                              </div>
                            </form>
                          </td>
                        ) : (
                          <>
                            <td>{c.description}</td>
                            <td>
                              {c.period === "MONTHLY" && <span>€ {c.amount.toFixed(2)}/mese</span>}
                              {(c.period === "YEARLY" || c.period === "YEARLY_PRORATED") && (
                                <span>€ {(c.amount / 12).toFixed(2)} /mese <span className="muted" style={{ fontSize: 12 }}>(da € {c.amount.toFixed(2)}/anno)</span></span>
                              )}
                              {c.period === "YEARLY_ONCE" && <>
                                <span>€ {c.amount.toFixed(2)} /anno</span><br />
                                <span className="muted" style={{ fontSize: 12 }}>(ogni {formatMonth(c.billingMonth)})</span>
                              </>}
                              {c.period === "ONE_OFF" && <>
                                <span>€ {c.amount.toFixed(2)}</span><br />
                                <span className="muted" style={{ fontSize: 12 }}>(Singolo, addebitato a {c.billingMonth}/{c.billingYear})</span>
                              </>}
                            </td>
                            {isAdmin && (
                              <td>
                                <div className="row" style={{ gap: 8 }}>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: "4px 8px", fontSize: 12 }}
                                    onClick={() => {
                                      setEditingFixedCostId(c.id);
                                      setEditingFixedCostPeriod(c.period === "YEARLY" ? "YEARLY_PRORATED" : c.period);
                                    }}
                                  >
                                    Modifica
                                  </button>
                                  <button
                                    className="btn secondary"
                                    style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                                    onClick={() => {
                                      if (confirm(`Sei sicuro di voler eliminare il costo fisso "${c.description}"?`)) {
                                        deleteFixedCost(partnership.id, c.id);
                                      }
                                    }}
                                  >
                                    Elimina
                                  </button>
                                </div>
                              </td>
                            )}
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: "var(--bg-secondary)", fontWeight: "bold" }}>
                    <td>Rata annuale</td>
                    <td>
                      € {partnership.fixedCosts.reduce((acc: number, c: any) => {
                        if (c.period === 'MONTHLY') return acc + Number(c.amount);
                        if (c.period === 'YEARLY_ONCE') return acc + Number(c.amount);
                      }, 0).toFixed(2)}
                      <div className="muted" style={{ fontSize: 11, fontWeight: "normal", marginTop: 4 }}>(non include le rate mensili fisse)</div>
                    </td>
                    {isAdmin && <td></td>}
                  </tr>
                  <tr style={{ background: "var(--bg-secondary)", fontWeight: "bold" }}>
                    <td>Rata mensile</td>
                    <td>
                      € {partnership.fixedCosts.reduce((acc: number, c: any) => {
                        if (c.period === 'MONTHLY') return acc + Number(c.amount);
                        if (c.period === 'YEARLY' || c.period === 'YEARLY_PRORATED') return acc + (Number(c.amount) / 12);
                        return acc; // YEARLY_ONCE not included in the standard monthly running total preview
                      }, 0).toFixed(2)}
                      <div className="muted" style={{ fontSize: 11, fontWeight: "normal", marginTop: 4 }}>(non include le rate annuali fisse)</div>
                    </td>
                    {isAdmin && <td></td>}
                  </tr>
                </tfoot>
              </table>
            )}

            {isAdmin && (
              <div style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
                <span className="muted" style={{ fontSize: 13 }}>Arrotonda mensile a:</span>
                <input
                  type="number"
                  step="0.01"
                  className="input"
                  style={{ width: 100, padding: "4px 8px" }}
                  placeholder="Es. 270"
                  value={roundingTarget}
                  onChange={(e) => setRoundingTarget(e.target.value)}
                />
                <button
                  className="btn secondary"
                  style={{ padding: "4px 12px", fontSize: 13 }}
                  onClick={async () => {
                    const currentTotal = partnership.fixedCosts.reduce((acc: number, c: any) => {
                      if (c.period === 'MONTHLY') return acc + Number(c.amount);
                      if (c.period === 'YEARLY' || c.period === 'YEARLY_PRORATED') return acc + (Number(c.amount) / 12);
                      return acc; // YEARLY_ONCE not included in the standard monthly running total preview
                    }, 0);
                    const target = parseFloat(roundingTarget);
                    if (isNaN(target) || target <= currentTotal) {
                      alert("Inserisci un importo superiore al totale attuale.");
                      return;
                    }
                    const diff = target - currentTotal;
                    const fd = new FormData();
                    fd.append("description", "Arrotondamento");
                    fd.append("amount", diff.toFixed(2));
                    fd.append("period", "MONTHLY");
                    await addFixedCost(partnership.id, fd);
                    setRoundingTarget("");
                  }}
                >
                  Aggiungi
                </button>
              </div>
            )}

            {isAdmin && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                <h3 style={{ marginTop: 0 }}>Aggiungi costo fisso</h3>
                <form action={async (fd) => {
                  const form = document.getElementById("add-fixed-cost-form") as HTMLFormElement;
                  await addFixedCost(partnership.id, fd);
                  form?.reset();
                  setNewFixedCostPeriod("MONTHLY");
                }} id="add-fixed-cost-form" className="grid">
                  <div className="field">
                    <label>Descrizione</label>
                    <input className="input" name="description" required placeholder="Es. Affitto Hangar" />
                  </div>
                  <div className="grid grid-2">
                    <div className="field">
                      <label>Periodicità</label>
                      <select className="select" name="period" value={newFixedCostPeriod} onChange={(e) => setNewFixedCostPeriod(e.target.value)}>
                        <option value="MONTHLY">Mensile</option>
                        <option value="YEARLY_PRORATED">Annuale diviso per mese</option>
                        <option value="YEARLY_ONCE">Annuale ogni 12 mesi</option>
                        <option value="ONE_OFF">Una tantum</option>
                      </select>
                    </div>
                    {newFixedCostPeriod === "YEARLY_ONCE" && (
                      <div className="field">
                        <label>Mese di addebito</label>
                        <select className="select" name="billingMonth">
                          <option value="1">Gennaio</option>
                          <option value="2">Febbraio</option>
                          <option value="3">Marzo</option>
                          <option value="4">Aprile</option>
                          <option value="5">Maggio</option>
                          <option value="6">Giugno</option>
                          <option value="7">Luglio</option>
                          <option value="8">Agosto</option>
                          <option value="9">Settembre</option>
                          <option value="10">Ottobre</option>
                          <option value="11">Novembre</option>
                          <option value="12">Dicembre</option>
                        </select>
                      </div>
                    )}
{newFixedCostPeriod === "ONE_OFF" && (
  <div className="grid grid-2">
    <div className="field">
      <label>Mese di addebito</label>
      <select className="select" name="billingMonth">
        <option value="1">Gennaio</option>
        <option value="2">Febbraio</option>
        <option value="3">Marzo</option>
        <option value="4">Aprile</option>
        <option value="5">Maggio</option>
        <option value="6">Giugno</option>
        <option value="7">Luglio</option>
        <option value="8">Agosto</option>
        <option value="9">Settembre</option>
        <option value="10">Ottobre</option>
        <option value="11">Novembre</option>
        <option value="12">Dicembre</option>
      </select>
    </div>
    <div className="field">
      <label>Anno di addebito</label>
      <input className="input" name="billingYear" type="number" min="2000" placeholder="2024" required />
    </div>
  </div>
)}
                    <div className="field">
                      <label>Importo (€)</label>
                      <input className="input" name="amount" type="number" step="0.01" min="0" required />
                    </div>
                  </div>
                  <SubmitButton>Aggiungi costo fisso</SubmitButton>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "MEMBERS" && (
        <div className="grid grid-2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Elenco Soci</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Ruolo</th>
                  {isAdmin && <th>Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {partnership.members.map((m: any) => (
                  <tr key={m.id}>
                    <td>{m.user.fullName || "Utente senza nome"} {m.user.id === currentUserId ? "(Tu)" : ""}</td>
                    <td>{m.user.email}</td>
                    <td>{m.role === "ADMIN" ? "Amministratore" : "Socio"}</td>
                    {isAdmin && (
                      <td>
                        {m.user.id !== currentUserId && (
                          <button
                            className="btn secondary"
                            style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                            onClick={() => {
                              if (confirm(`Sei sicuro di voler rimuovere l'utente ${m.user.email}?`)) {
                                removeMember(partnership.id, m.userId);
                              }
                            }}
                          >
                            Rimuovi
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {partnership.invitations && partnership.invitations.map((inv: any) => (
                  <tr key={inv.id} style={{ opacity: 0.75 }}>
                    <td><span className="muted" style={{ fontStyle: "italic" }}>Invito in attesa</span></td>
                    <td>{inv.email}</td>
                    <td>Socio (in attesa)</td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn secondary"
                          style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                          onClick={async () => {
                            if (confirm(`Sei sicuro di voler annullare l'invito per ${inv.email}?`)) {
                              await cancelInvitation(partnership.id, inv.id);
                            }
                          }}
                        >
                          Annulla
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Aggiungi Socio</h2>
              <p className="muted">Se l'utente non è registrato, riceverà un invito email per creare un account.</p>
              <form action={addMember.bind(null, partnership.id)} className="grid">
                <div className="field">
                  <label>Email utente</label>
                  <input className="input" type="email" name="email" required placeholder="email@esempio.it" />
                </div>
                <SubmitButton>Aggiungi alla società</SubmitButton>
              </form>
            </div>
          )}
        </div>
      )}

      {activeTab === "REPORT" && (
        <div className="card">
          <div className="between" style={{ marginBottom: 24 }}>
            <div>
              <h2 style={{ marginTop: 0 }}>Rendiconto Mensile</h2>
              <div className="muted">Contributo per costi fissi e ore volate.</div>
            </div>

            <div className="row">
              <select className="select" value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i} value={i}>{new Date(0, i).toLocaleString('it-IT', { month: 'long' })}</option>
                ))}
              </select>
              <select className="select" value={reportYear} onChange={e => setReportYear(Number(e.target.value))}>
                <option value={new Date().getFullYear() - 1}>{new Date().getFullYear() - 1}</option>
                <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
              </select>
            </div>
          </div>

          {isLoadingReport ? (
            <div className="muted">Caricamento in corso...</div>
          ) : reportData ? (
            <>
              <div className="grid grid-2" style={{ marginBottom: 24 }}>
                <div className="card" style={{ background: "var(--bg-secondary)" }}>
                  <div className="muted">Totale costi fissi (Mese)</div>
                  <div className="big-number">€ {reportData.fixedCostTotal.toFixed(2)}</div>
                </div>
                <div className="card" style={{ background: "var(--bg-secondary)" }}>
                  <div className="muted">Quota fissa per socio ({partnership.members.length == 1 ? `1 socio` : `${partnership.members.length} soci`})</div>
                  <div className="big-number">€ {reportData.fixedCostPerMember.toFixed(2)}</div>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>Voli effettuati</th>
                    <th>Ore volate</th>
                    <th>Costo orario voli</th>
                    <th>Quota fissa</th>
                    <th>Spese anticipate</th>
                    <th>Totale da versare</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.reports.map((r: any) => (
                    <tr key={r.userId}>
                      <td>
                        <strong>{r.fullName}</strong>
                        {r.userId === currentUserId && " (Tu)"}
                      </td>
                      <td>{r.flightsCount} voli</td>
                      <td>{formatMinutes(r.durationMinutes)}</td>
                      <td>€ {r.flightCost.toFixed(2)}</td>
                      <td>€ {r.fixedCost.toFixed(2)}</td>
                      <td style={{ color: r.advancedExpense > 0 ? "var(--success)" : "inherit" }}>
                        {r.advancedExpense > 0 ? `- € ${r.advancedExpense.toFixed(2)}` : "-"}
                      </td>
                      <td>
                        <strong style={{ fontSize: 18, color: r.totalCost < 0 ? "var(--success)" : "inherit" }}>
                          € {r.totalCost.toFixed(2)}
                        </strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : (
            <div className="error">Errore nel caricamento del rendiconto.</div>
          )}
        </div>
      )}

      {activeTab === "CASSA" && (() => {
        const totalIncome = partnership.transactions.filter((t: any) => t.type === "INCOME").reduce((acc: number, t: any) => acc + t.amount, 0);
        const totalExpense = partnership.transactions.filter((t: any) => t.type === "EXPENSE" || t.type === "MEMBER_EXPENSE").reduce((acc: number, t: any) => acc + t.amount, 0);
        const balance = totalIncome - totalExpense;

        return (
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Cassa Società</h2>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="card" style={{ background: "var(--bg-secondary)" }}>
                <div className="muted">Totale Entrate</div>
                <div className="big-number" style={{ color: "var(--success, #16a34a)" }}>€ {totalIncome.toFixed(2)}</div>
              </div>
              <div className="card" style={{ background: "var(--bg-secondary)" }}>
                <div className="muted">Totale Uscite</div>
                <div className="big-number" style={{ color: "var(--danger, #dc2626)" }}>€ {totalExpense.toFixed(2)}</div>
              </div>
              <div className="card" style={{ background: "var(--bg-secondary)", border: balance < 0 ? "2px solid var(--danger)" : "2px solid var(--success)" }}>
                <div className="muted">Saldo Cassa</div>
                <div className="big-number">€ {balance.toFixed(2)}</div>
              </div>
            </div>

            <h3 style={{ marginTop: 24 }}>Riepilogo Crediti Versati / Anticipati dai Soci</h3>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              {partnership.members.map((m: any) => {
                const memberVersamenti = partnership.transactions.filter((t: any) => t.userId === m.user?.id && t.type === "INCOME").reduce((acc: number, t: any) => acc + t.amount, 0);
                const memberAnticipi = partnership.transactions.filter((t: any) => t.userId === m.user?.id && t.type === "MEMBER_EXPENSE").reduce((acc: number, t: any) => acc + t.amount, 0);
                const totalCredit = memberVersamenti + memberAnticipi;
                return (
                  <div key={m.user?.id} className="card" style={{ padding: 12, background: "var(--bg-secondary)" }}>
                    <div className="muted" style={{ fontSize: 12 }}>{m.user?.fullName || m.user?.email}</div>
                    <div style={{ fontSize: 16, fontWeight: "bold", marginTop: 4, color: totalCredit > 0 ? "var(--success)" : "inherit" }}>
                      Credito Totale: € {totalCredit.toFixed(2)}
                    </div>
                    <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
                      Ricariche: € {memberVersamenti.toFixed(2)} | Anticipi: € {memberAnticipi.toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginBottom: 24, padding: 16, background: "var(--bg-secondary)", borderRadius: 8 }}>
              <h3 style={{ marginTop: 0 }}>Nuova Transazione</h3>
              <form action={addTransaction.bind(null, partnership.id)} className="grid grid-5" style={{ gap: 8, alignItems: "end" }}>
                <div>
                  <label style={{ fontSize: 12 }}>Data</label>
                  <input className="input" type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>Tipo</label>
                  <select className="select" name="type">
                    <option value="INCOME">Ricarica / Versamento</option>
                    <option value="MEMBER_EXPENSE">Spesa anticipata (Benzina / Altro)</option>
                    {isAdmin && <option value="EXPENSE">Uscita Cassa Società</option>}
                  </select>
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ fontSize: 12 }}>Descrizione</label>
                  <input className="input" name="description" required placeholder="Es. Quota mese corrente..." />
                </div>
                <div>
                  <label style={{ fontSize: 12 }}>Importo (€)</label>
                  <input className="input" name="amount" type="number" step="0.01" min="0.01" required />
                </div>
                <SubmitButton style={{ gridColumn: "span 5" }}>Aggiungi Transazione</SubmitButton>
              </form>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Utente / Tipo</th>
                  <th>Descrizione</th>
                  <th>Entrata</th>
                  <th>Uscita</th>
                  {isAdmin && <th>Azioni</th>}
                </tr>
              </thead>
              <tbody>
                {partnership.transactions.map((t: any) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString("it-IT")}</td>
                    <td>
                      {t.type === "INCOME" ? (
                        <span style={{ color: "var(--success)" }}>Ricarica da: {t.user?.fullName || t.user?.email || "Utente sconosciuto"}</span>
                      ) : t.type === "MEMBER_EXPENSE" ? (
                        <span style={{ color: "var(--warning, #d97706)" }}>Anticipo da: {t.user?.fullName || t.user?.email || "Utente sconosciuto"}</span>
                      ) : (
                        <span style={{ color: "var(--danger)" }}>Uscita Cassa Società</span>
                      )}
                    </td>
                    <td>{t.description}</td>
                    <td>{t.type === "INCOME" ? `€ ${t.amount.toFixed(2)}` : "-"}</td>
                    <td>{t.type === "EXPENSE" || t.type === "MEMBER_EXPENSE" ? `€ ${t.amount.toFixed(2)}` : "-"}</td>
                    {isAdmin && (
                      <td>
                        <button
                          className="btn secondary"
                          style={{ padding: "4px 8px", fontSize: 12, color: "var(--danger)" }}
                          onClick={() => {
                            if (confirm(`Eliminare la transazione "${t.description}"?`)) {
                              deleteTransaction(partnership.id, t.id);
                            }
                          }}
                        >
                          Elimina
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {partnership.transactions.length === 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} style={{ textAlign: "center", padding: 24 }} className="muted">
                      Nessuna transazione registrata.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {activeTab === "SETTINGS" && isAdmin && (
        <div className="grid grid-2" style={{ alignItems: "flex-start" }}>
          {/* Card Cambio Nome */}
          <div className="card">
            <h2 style={{ marginTop: 0, marginBottom: 8 }}>Impostazioni Società</h2>
            <p className="muted" style={{ fontSize: "0.9rem", marginTop: 0, marginBottom: 16 }}>
              Modifica i dettagli principali della tua società di volo.
            </p>

            <form action={async (fd) => {
              await updatePartnershipName(partnership.id, fd);
            }} className="grid">
              <div className="field">
                <label htmlFor="name" style={{ fontSize: "0.85rem" }}>Nome della Società</label>
                <input
                  className="input"
                  id="name"
                  name="name"
                  required
                  defaultValue={partnership.name}
                  placeholder="Es. Aero Club Milano"
                />
              </div>
              <SubmitButton style={{ marginTop: 4 }}>
                Salva modifiche
              </SubmitButton>
            </form>
          </div>

          {/* Card Zona Pericolo/Destruttiva */}
          <div className="card" style={{ borderColor: "var(--danger)" }}>
            <div
              style={{
                background: "rgba(239, 68, 68, 0.05)",
                border: "1px solid var(--danger)",
                color: "var(--danger)",
                padding: "12px 16px",
                borderRadius: 12,
                fontSize: "0.9rem",
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              <strong>Attenzione:</strong> L'eliminazione della società è un'azione irreversibile.
              Verranno eliminati permanentemente tutti i dati della società inclusi:
              <ul style={{ margin: "8px 0 0 20px", padding: 0 }}>
                <li>L'associazione dei soci (non i loro account)</li>
                <li>Tutti gli aerei registrati per questa società</li>
                <li>Tutti i costi fissi e i relativi report</li>
                <li>Tutte le transazioni di cassa della società</li>
              </ul>
              I voli registrati dai singoli soci rimarranno nel loro registro personale,
              ma non faranno più riferimento a questa società.
            </div>

            <button
              type="button"
              className="btn"
              style={{ background: "var(--danger)", borderColor: "var(--danger)", color: "white" }}
              onClick={async () => {
                const confirm1 = confirm("Sei sicuro di voler eliminare definitivamente questa società?");
                if (!confirm1) return;

                const confirm2 = confirm("Questa azione NON può essere annullata. Confermi l'eliminazione?");
                if (!confirm2) return;

                await deletePartnership(partnership.id);
              }}
            >
              Elimina società
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
