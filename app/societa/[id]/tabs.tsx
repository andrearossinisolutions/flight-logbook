"use client";

import { useState, useEffect } from "react";
import { addAircraft, addFixedCost, addMember, getMonthlyReport, deleteAircraft, deleteFixedCost, removeMember, updateAircraft, updateFixedCost } from "./actions";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m < 10 ? '0' : ''}${m}`;
}

export function PartnershipTabs({ partnership, isAdmin, currentUserId }: any) {
  const [activeTab, setActiveTab] = useState("AIRCRAFTS");
  
  // Edit state
  const [editingAircraftId, setEditingAircraftId] = useState<string | null>(null);
  const [editingFixedCostId, setEditingFixedCostId] = useState<string | null>(null);

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
      <div className="row" style={{ marginBottom: 24, gap: 16 }}>
        <button 
          className={`btn ${activeTab === "AIRCRAFTS" ? "" : "secondary"}`} 
          onClick={() => setActiveTab("AIRCRAFTS")}
        >
          Aerei e Costi
        </button>
        <button 
          className={`btn ${activeTab === "MEMBERS" ? "" : "secondary"}`} 
          onClick={() => setActiveTab("MEMBERS")}
        >
          Soci
        </button>
        <button 
          className={`btn ${activeTab === "REPORT" ? "" : "secondary"}`} 
          onClick={() => setActiveTab("REPORT")}
        >
          Rendiconto Mensile
        </button>
      </div>

      {activeTab === "AIRCRAFTS" && (
        <div className="grid grid-2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Aerei della società</h2>
            {partnership.aircrafts.length === 0 ? (
              <div className="muted">Nessun aereo inserito.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Marche</th>
                    <th>Tipo</th>
                    <th>Costo Orario (Totale)</th>
                    {isAdmin && <th>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {partnership.aircrafts.map((a: any) => {
                    const isEditing = editingAircraftId === a.id;
                    return (
                    <tr key={a.id}>
                      {isEditing ? (
                        <td colSpan={isAdmin ? 4 : 3}>
                          <form action={async (fd) => {
                            await updateAircraft(partnership.id, a.id, fd);
                            setEditingAircraftId(null);
                          }} className="grid grid-4" style={{ gap: 8, alignItems: "end" }}>
                            <div>
                              <label style={{ fontSize: 11 }}>Marche</label>
                              <input className="input" name="registration" defaultValue={a.registration} required style={{ padding: "4px 8px" }} />
                            </div>
                            <div>
                              <label style={{ fontSize: 11 }}>Tipo</label>
                              <input className="input" name="type" defaultValue={a.type} required style={{ padding: "4px 8px" }} />
                            </div>
                            <div className="row" style={{ gridColumn: "span 2", gap: 8 }}>
                              <div>
                                <label style={{ fontSize: 11 }}>Benzina</label>
                                <input className="input" name="hourlyFuelCost" type="number" step="0.01" min="0" defaultValue={a.hourlyFuelCost} required style={{ padding: "4px 8px" }} />
                              </div>
                              <div>
                                <label style={{ fontSize: 11 }}>Manutenz.</label>
                                <input className="input" name="hourlyMaintCost" type="number" step="0.01" min="0" defaultValue={a.hourlyMaintCost} required style={{ padding: "4px 8px" }} />
                              </div>
                              <div>
                                <label style={{ fontSize: 11 }}>Fondo</label>
                                <input className="input" name="hourlyEngineFund" type="number" step="0.01" min="0" defaultValue={a.hourlyEngineFund} required style={{ padding: "4px 8px" }} />
                              </div>
                              <div className="row" style={{ gap: 4 }}>
                                <button className="btn" type="submit" style={{ padding: "4px 12px" }}>Salva</button>
                                <button className="btn secondary" type="button" onClick={() => setEditingAircraftId(null)} style={{ padding: "4px 12px" }}>Annulla</button>
                              </div>
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
                  <button className="btn">Aggiungi aereo</button>
                </form>
              </div>
            )}
          </div>

          <div className="card">
            <h2 style={{ marginTop: 0 }}>Costi Fissi (Mensili)</h2>
            {partnership.fixedCosts.length === 0 ? (
              <div className="muted">Nessun costo fisso inserito.</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Descrizione</th>
                    <th>Importo (Mese)</th>
                    {isAdmin && <th>Azioni</th>}
                  </tr>
                </thead>
                <tbody>
                  {partnership.fixedCosts.map((c: any) => {
                    const isEditing = editingFixedCostId === c.id;
                    return (
                    <tr key={c.id}>
                      {isEditing ? (
                        <td colSpan={isAdmin ? 3 : 2}>
                          <form action={async (fd) => {
                            await updateFixedCost(partnership.id, c.id, fd);
                            setEditingFixedCostId(null);
                          }} className="row" style={{ gap: 8 }}>
                            <input className="input" name="description" defaultValue={c.description} required style={{ padding: "4px 8px", flex: 1 }} />
                            <select className="select" name="period" defaultValue={c.period} style={{ padding: "4px 8px", width: 120 }}>
                              <option value="MONTHLY">Mensile</option>
                              <option value="YEARLY">Annuale</option>
                            </select>
                            <input className="input" name="amount" type="number" step="0.01" min="0" defaultValue={c.amount} required style={{ padding: "4px 8px", width: 100 }} />
                            <button className="btn" type="submit" style={{ padding: "4px 12px" }}>Salva</button>
                            <button className="btn secondary" type="button" onClick={() => setEditingFixedCostId(null)} style={{ padding: "4px 12px" }}>Annulla</button>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td>{c.description}</td>
                          <td>
                            € {c.period === "YEARLY" ? (c.amount / 12).toFixed(2) : c.amount.toFixed(2)}
                            {c.period === "YEARLY" && <span className="muted" style={{ fontSize: 12, marginLeft: 4 }}>(da € {c.amount.toFixed(2)}/anno)</span>}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="row" style={{ gap: 8 }}>
                                <button 
                                  className="btn secondary" 
                                  style={{ padding: "4px 8px", fontSize: 12 }}
                                  onClick={() => setEditingFixedCostId(c.id)}
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
                    <td>Totale mensile societario</td>
                    <td>
                      € {partnership.fixedCosts.reduce((acc: number, c: any) => acc + (c.period === 'YEARLY' ? Number(c.amount) / 12 : Number(c.amount)), 0).toFixed(2)}
                    </td>
                    {isAdmin && <td></td>}
                  </tr>
                </tfoot>
              </table>
            )}

            {isAdmin && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                <h3 style={{ marginTop: 0 }}>Aggiungi costo fisso</h3>
                <form action={addFixedCost.bind(null, partnership.id)} className="grid">
                  <div className="field">
                    <label>Descrizione</label>
                    <input className="input" name="description" required placeholder="Es. Affitto Hangar" />
                  </div>
                  <div className="grid grid-2">
                    <div className="field">
                      <label>Periodicità</label>
                      <select className="select" name="period">
                        <option value="MONTHLY">Mensile</option>
                        <option value="YEARLY">Annuale</option>
                      </select>
                    </div>
                    <div className="field">
                      <label>Importo (€)</label>
                      <input className="input" name="amount" type="number" step="0.01" min="0" required />
                    </div>
                  </div>
                  <button className="btn">Aggiungi costo fisso</button>
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
              </tbody>
            </table>
          </div>

          {isAdmin && (
            <div className="card">
              <h2 style={{ marginTop: 0 }}>Aggiungi Socio</h2>
              <p className="muted">L'utente deve essere già registrato all'app con questa email.</p>
              <form action={addMember.bind(null, partnership.id)} className="grid">
                <div className="field">
                  <label>Email utente</label>
                  <input className="input" type="email" name="email" required placeholder="email@esempio.it" />
                </div>
                <button className="btn">Aggiungi alla società</button>
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
                {Array.from({length: 12}).map((_, i) => (
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
                  <div className="muted">Totale Costi Fissi (Mese)</div>
                  <div className="big-number">€ {reportData.fixedCostTotal.toFixed(2)}</div>
                </div>
                <div className="card" style={{ background: "var(--bg-secondary)" }}>
                  <div className="muted">Quota Fissa per Socio ({partnership.members.length} soci)</div>
                  <div className="big-number">€ {reportData.fixedCostPerMember.toFixed(2)}</div>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Socio</th>
                    <th>Voli effettuati</th>
                    <th>Ore volate</th>
                    <th>Costo Orario Voli</th>
                    <th>Quota Fissa</th>
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
                      <td><strong style={{ fontSize: 18 }}>€ {r.totalCost.toFixed(2)}</strong></td>
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
    </div>
  );
}
