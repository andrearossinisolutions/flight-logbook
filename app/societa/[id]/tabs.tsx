"use client";

import { useState, useEffect } from "react";
import { addAircraft, addFixedCost, addMember, getMonthlyReport } from "./actions";

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m < 10 ? '0' : ''}${m}`;
}

export function PartnershipTabs({ partnership, isAdmin, currentUserId }: any) {
  const [activeTab, setActiveTab] = useState("AIRCRAFTS");
  
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
                  </tr>
                </thead>
                <tbody>
                  {partnership.aircrafts.map((a: any) => (
                    <tr key={a.id}>
                      <td><strong>{a.registration}</strong></td>
                      <td>{a.type}</td>
                      <td>€ {(a.hourlyFuelCost + a.hourlyMaintCost + a.hourlyEngineFund).toFixed(2)} / h</td>
                    </tr>
                  ))}
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
                  </tr>
                </thead>
                <tbody>
                  {partnership.fixedCosts.map((c: any) => (
                    <tr key={c.id}>
                      <td>{c.description}</td>
                      <td>€ {c.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
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
                  <div className="field">
                    <label>Importo Mensile (€)</label>
                    <input className="input" name="amount" type="number" step="0.01" min="0" required />
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
                </tr>
              </thead>
              <tbody>
                {partnership.members.map((m: any) => (
                  <tr key={m.id}>
                    <td>{m.user.fullName || "Utente senza nome"} {m.user.id === currentUserId ? "(Tu)" : ""}</td>
                    <td>{m.user.email}</td>
                    <td>{m.role === "ADMIN" ? "Amministratore" : "Socio"}</td>
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
