"use client";

import React, { useState, useEffect } from "react";
import { addAircraft, addFixedCost, addMember, getMonthlyReport, deleteAircraft, deleteFixedCost, removeMember, updateAircraft, updateFixedCost, addTransaction, deleteTransaction, updatePartnershipName, deletePartnership, cancelInvitation, addMessage, deleteMessage, addAircraftReminder, updateAircraftReminder, deleteAircraftReminder, logAircraftMaintenance, deleteMaintenanceLog, addRecommendedReminders } from "./actions";
import { SubmitButton } from "@/components/submit-button";
import { formatDateDisplay, daysFromDate } from "@/lib/utils";
import {
  DashboardIcon,
  PlaneIcon,
  UsersIcon,
  FileTextIcon,
  WalletIcon,
  SettingsIcon
} from "@/components/icons";

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

function handleCheckboxChange(
  e: React.ChangeEvent<HTMLInputElement>,
  reminders: any[]
) {
  const checkbox = e.target;
  const isChecked = checkbox.checked;
  const changedId = checkbox.value;

  const form = checkbox.form;
  if (!form) return;

  const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input[name="covers"]'));

  // Build mapping of reminder relations
  const reminderMap = new Map<string, { covers: string[]; coveredBy: string[] }>();
  for (const r of reminders) {
    reminderMap.set(r.id, {
      covers: r.covers?.map((c: any) => c.id) || [],
      coveredBy: r.coveredBy?.map((c: any) => c.id) || [],
    });
  }

  const visited = new Set<string>();

  if (isChecked) {
    // Cascade check: check everything that this reminder covers (recursively)
    const checkQueue = [...(reminderMap.get(changedId)?.covers || [])];
    while (checkQueue.length > 0) {
      const currentId = checkQueue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);
        
        const input = inputs.find(i => i.value === currentId);
        if (input) {
          input.checked = true;
        }

        const subCovers = reminderMap.get(currentId)?.covers || [];
        checkQueue.push(...subCovers);
      }
    }
  } else {
    // Cascade uncheck: uncheck everything that covers this reminder (recursively)
    const uncheckQueue = [...(reminderMap.get(changedId)?.coveredBy || [])];
    while (uncheckQueue.length > 0) {
      const currentId = uncheckQueue.shift()!;
      if (!visited.has(currentId)) {
        visited.add(currentId);

        const input = inputs.find(i => i.value === currentId);
        if (input) {
          input.checked = false;
        }

        const subCoveredBy = reminderMap.get(currentId)?.coveredBy || [];
        uncheckQueue.push(...subCoveredBy);
      }
    }
  }
}

export function PartnershipTabs({ partnership, isAdmin, currentUserId, lastFlights = [] }: any) {
  const [activeTab, setActiveTab] = useState("BACHECA");

  // Calcolo scadenze manutenzione per Bacheca
  const alerts: any[] = [];
  if (partnership.aircrafts) {
    for (const a of partnership.aircrafts) {
      const totalHours = a.totalHours;
      for (const r of (a.reminders || [])) {
        let isOverdue = false;
        let isWarning = false;
        
        let hoursRemainingNum = Infinity;
        let daysRemainingNum = Infinity;
        
        const detailsParts: string[] = [];
        
        if (r.hoursInterval !== null && r.hoursInterval !== undefined) {
          const hoursInt = Number(r.hoursInterval);
          const nextDeadlineHours = Number(r.lastCompletedHours) + hoursInt;
          const remainingHours = nextDeadlineHours - totalHours;
          hoursRemainingNum = remainingHours;
          
          if (remainingHours <= 10) {
            isWarning = true;
          }
          if (remainingHours <= 0) {
            isOverdue = true;
          }
          
          detailsParts.push(`Scadenza a ${nextDeadlineHours.toFixed(1)}h (ogni ${hoursInt}h)`);
        }
        
        if (r.monthsInterval !== null && r.monthsInterval !== undefined && r.lastCompletedDate) {
          const monthsInt = Number(r.monthsInterval);
          const nextDeadlineDate = new Date(r.lastCompletedDate);
          nextDeadlineDate.setMonth(nextDeadlineDate.getMonth() + monthsInt);
          
          const today = new Date();
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const deadlineStart = new Date(nextDeadlineDate.getFullYear(), nextDeadlineDate.getMonth(), nextDeadlineDate.getDate());
          
          const remainingDays = Math.ceil((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
          daysRemainingNum = remainingDays;
          
          if (remainingDays <= 30) {
            isWarning = true;
          }
          if (remainingDays <= 0) {
            isOverdue = true;
          }
          
          const formattedDate = nextDeadlineDate.toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
          });
          detailsParts.push(`Scadenza il ${formattedDate} (ogni ${monthsInt} mesi)`);
        }
        
        if (isWarning || isOverdue) {
          let labelText = "";
          const hasHours = r.hoursInterval !== null && r.hoursInterval !== undefined;
          const hasMonths = r.monthsInterval !== null && r.monthsInterval !== undefined && r.lastCompletedDate;
          
          const isHoursMoreUrgent = hasHours && (!hasMonths || (hoursRemainingNum / 10 <= daysRemainingNum / 30));
          
          if (isHoursMoreUrgent) {
            if (hoursRemainingNum <= 0) {
              labelText = `SCADUTO da ${Math.abs(hoursRemainingNum).toFixed(1)} ore!`;
            } else {
              labelText = `In scadenza! Mancano solo ${hoursRemainingNum.toFixed(1)} ore.`;
            }
          } else if (hasMonths) {
            if (daysRemainingNum <= 0) {
              const absDays = Math.abs(daysRemainingNum);
              labelText = `SCADUTO da ${absDays} giorn${absDays === 1 ? 'o' : 'i'}!`;
            } else {
              labelText = `In scadenza! Mancano solo ${daysRemainingNum} giorn${daysRemainingNum === 1 ? 'o' : 'i'}.`;
            }
          }
          
          alerts.push({
            aircraftRegistration: a.registration,
            reminderDescription: r.description,
            isOverdue,
            labelText,
            detailsText: `${r.description} · ${detailsParts.join(" o ")}`
          });
        }
      }
    }
  }

  // Edit state
  const [editingAircraftId, setEditingAircraftId] = useState<string | null>(null);
  const [loggingReminderId, setLoggingReminderId] = useState<string | null>(null);
  const [editingFixedCostId, setEditingFixedCostId] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
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
            title="Bacheca"
          >
            <DashboardIcon size={18} />
            <span className="navbar-tab-text">Bacheca</span>
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "AIRCRAFTS" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "AIRCRAFTS" ? "white" : "transparent" }}
            onClick={() => setActiveTab("AIRCRAFTS")}
            title="Aerei e Costi"
          >
            <PlaneIcon size={18} />
            <span className="navbar-tab-text">Aerei e Costi</span>
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "MEMBERS" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "MEMBERS" ? "white" : "transparent" }}
            onClick={() => setActiveTab("MEMBERS")}
            title="Soci"
          >
            <UsersIcon size={18} />
            <span className="navbar-tab-text">Soci</span>
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "REPORT" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "REPORT" ? "white" : "transparent" }}
            onClick={() => setActiveTab("REPORT")}
            title="Rendiconto Mensile"
          >
            <FileTextIcon size={18} />
            <span className="navbar-tab-text">Rendiconto Mensile</span>
          </button>
          <button
            type="button"
            className={`navbar-tab ${activeTab === "CASSA" ? "active" : ""}`}
            style={{ border: "none", cursor: "pointer", background: activeTab === "CASSA" ? "white" : "transparent" }}
            onClick={() => setActiveTab("CASSA")}
            title="Cassa"
          >
            <WalletIcon size={18} />
            <span className="navbar-tab-text">Cassa</span>
          </button>
          {isAdmin && (
            <button
              type="button"
              className={`navbar-tab ${activeTab === "SETTINGS" ? "active" : ""}`}
              style={{ border: "none", cursor: "pointer", background: activeTab === "SETTINGS" ? "white" : "transparent" }}
              onClick={() => setActiveTab("SETTINGS")}
              title="Impostazioni"
            >
              <SettingsIcon size={18} />
              <span className="navbar-tab-text">Impostazioni</span>
            </button>
          )}
        </div>
      </div>

      {activeTab === "BACHECA" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {alerts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.map((alert, i) => {
                const isOverdue = alert.isOverdue;
                const bg = isOverdue ? "rgba(180, 35, 24, 0.08)" : "#fffbeb";
                const border = isOverdue ? "1px solid rgba(220, 38, 38, 0.2)" : "1px solid rgba(217, 119, 6, 0.2)";
                const color = isOverdue ? "var(--danger)" : "#b45309";
                const icon = isOverdue ? "🚨" : "⚠️";

                return (
                  <div 
                    key={i} 
                    style={{ 
                      backgroundColor: bg, 
                      border, 
                      borderRadius: 16, 
                      padding: "16px 20px", 
                      color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 16
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: "1.5rem" }}>{icon}</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem" }}>
                          Manutenzione {alert.aircraftRegistration}
                        </div>
                        <div style={{ fontSize: "0.85rem", marginTop: 2, opacity: 0.9 }}>
                          {alert.labelText} · {alert.detailsText}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setActiveTab("AIRCRAFTS")}
                      className="btn"
                      style={{ 
                        backgroundColor: isOverdue ? "var(--danger)" : "#b45309", 
                        color: "white", 
                        padding: "8px 16px", 
                        fontSize: "0.85rem", 
                        border: "none",
                        borderRadius: 12,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        cursor: "pointer"
                      }}
                    >
                      Gestisci
                    </button>
                  </div>
                );
              })}
            </div>
          )}

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
                        <span>🛫 {flight.takeoffPlace || "?"} 🛬 {flight.arrivalPlace || "?"}</span>
                        <span style={{ color: "var(--border)" }}>•</span>
                        <span>⏱️ {formatMinutes(flight.durationMinutes)}</span>
                        {flight.hobbsStartMinutes != null && flight.hobbsEndMinutes != null && (
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
    </div>
  )}

      {activeTab === "AIRCRAFTS" && (
        <div className="grid grid-2">
          <div className="card">
            <h2 style={{ marginTop: 0 }}>Aerei della Società</h2>
            {partnership.aircrafts.length === 0 ? (
              <div className="muted">Nessun aereo inserito.</div>
            ) : (
              <table className="table aircrafts-table">
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
                      <React.Fragment key={a.id}>
                        <tr className="aircraft-row">
                          {isEditing ? (
                            <td colSpan={isAdmin ? 4 : 3} style={{ padding: "16px" }}>
                              <form action={async (fd) => {
                                await updateAircraft(partnership.id, a.id, fd);
                                setEditingAircraftId(null);
                              }} className="grid" style={{ gap: 16, backgroundColor: "var(--bg-card-hover)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border)" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "8px", marginBottom: "4px" }}>
                                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>Modifica Aereo: <strong>{a.registration}</strong></span>
                                </div>
                                
                                <div className="grid grid-3" style={{ gap: 16 }}>
                                  <div className="field">
                                    <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Marche</label>
                                    <input className="input" name="registration" defaultValue={a.registration} required />
                                  </div>
                                  <div className="field">
                                    <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Tipo</label>
                                    <input className="input" name="type" defaultValue={a.type} required />
                                  </div>
                                  <div className="field">
                                    <label style={{ fontWeight: 500, fontSize: "0.85rem", marginBottom: "4px", display: "block" }}>Ore motore iniziali</label>
                                    <input className="input" name="initialHours" type="number" step="0.1" min="0" defaultValue={a.initialHours} required />
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
                              <td>
                                <strong>{a.registration}</strong>
                                <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                                  ⏱️ {a.totalHours.toFixed(1)} ore totali
                                </div>
                              </td>
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
                        {!isEditing && (
                          <tr key={`${a.id}-reminders`} className="aircraft-reminders-row">
                            <td colSpan={isAdmin ? 4 : 3} style={{ padding: "12px 24px 24px 24px", backgroundColor: "var(--bg)", borderTop: "none" }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                                <div className="between" style={{ borderBottom: "1px solid var(--border)", paddingBottom: 8, alignItems: "center" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                    <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--primary-strong)" }}>🔔 Scadenze Manutenzione ({a.registration})</h4>
                                  </div>
                                  <span className="muted" style={{ fontSize: "0.85rem" }}>
                                    Stato motore: <strong>{a.totalHours.toFixed(1)} h</strong> (Base: {a.initialHours.toFixed(1)}h)
                                  </span>
                                </div>

                                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                                  {(!a.reminders || a.reminders.length === 0) ? (
                                    <div className="muted" style={{ fontSize: "0.85rem", fontStyle: "italic" }}>
                                      Nessuna scadenza configurata per questo velivolo.
                                    </div>
                                  ) : (
                                    a.reminders.map((r: any) => {
                                      let isOverdue = false;
                                      let isWarning = false;
                                      
                                      let hoursText = "";
                                      let dateText = "";
                                      let hoursRemainingNum = Infinity;
                                      let daysRemainingNum = Infinity;
                                      
                                      if (r.hoursInterval !== null && r.hoursInterval !== undefined) {
                                        const hoursInt = Number(r.hoursInterval);
                                        const nextDeadlineHours = Number(r.lastCompletedHours) + hoursInt;
                                        const remainingHours = nextDeadlineHours - a.totalHours;
                                        hoursRemainingNum = remainingHours;
                                        
                                        if (remainingHours <= 0) {
                                          isOverdue = true;
                                          hoursText = `SCADUTO da ${Math.abs(remainingHours).toFixed(1)}h (limite: ${nextDeadlineHours.toFixed(1)}h)`;
                                        } else if (remainingHours <= 10) {
                                          isWarning = true;
                                          hoursText = `In scadenza: mancano ${remainingHours.toFixed(1)}h (limite: ${nextDeadlineHours.toFixed(1)}h)`;
                                        } else {
                                          hoursText = `Mancano ${remainingHours.toFixed(1)}h (limite: ${nextDeadlineHours.toFixed(1)}h)`;
                                        }
                                      }
                                      
                                      if (r.monthsInterval !== null && r.monthsInterval !== undefined && r.lastCompletedDate) {
                                        const monthsInt = Number(r.monthsInterval);
                                        const nextDeadlineDate = new Date(r.lastCompletedDate);
                                        nextDeadlineDate.setMonth(nextDeadlineDate.getMonth() + monthsInt);
                                        
                                        const today = new Date();
                                        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                                        const deadlineStart = new Date(nextDeadlineDate.getFullYear(), nextDeadlineDate.getMonth(), nextDeadlineDate.getDate());
                                        
                                        const remainingDays = Math.ceil((deadlineStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
                                        daysRemainingNum = remainingDays;
                                        
                                        const formattedDate = nextDeadlineDate.toLocaleDateString("it-IT", {
                                          day: "2-digit",
                                          month: "2-digit",
                                          year: "numeric"
                                        });
                                        
                                        if (remainingDays <= 0) {
                                          isOverdue = true;
                                          const absDays = Math.abs(remainingDays);
                                          dateText = `SCADUTO da ${absDays} giorn${absDays === 1 ? 'o' : 'i'} (il ${formattedDate})`;
                                        } else if (remainingDays <= 30) {
                                          isWarning = true;
                                          dateText = `In scadenza: mancano ${remainingDays} giorn${remainingDays === 1 ? 'o' : 'i'} (il ${formattedDate})`;
                                        } else {
                                          dateText = `Mancano ${remainingDays} giorn${remainingDays === 1 ? 'o' : 'i'} (il ${formattedDate})`;
                                        }
                                      }
                                      
                                      let statusColor = "#1f6f5b";
                                      let statusBg = "#ecf5f2";
                                      let statusText = "In regola";
                                      
                                      if (isOverdue) {
                                        statusColor = "var(--danger)";
                                        statusBg = "rgba(180, 35, 24, 0.1)";
                                        statusText = `🚨 SCADUTO!`;
                                      } else if (isWarning) {
                                        statusColor = "#b45309";
                                        statusBg = "#fef3c7";
                                        statusText = `⚠️ In scadenza!`;
                                      } else {
                                        statusText = `✅ In regola`;
                                      }
                                      
                                      let detailStatus = "";
                                      if (hoursText && dateText) {
                                        detailStatus = `${hoursText} oppure (la prima che arriva) ${dateText}`;
                                      } else if (hoursText) {
                                        detailStatus = hoursText;
                                      } else if (dateText) {
                                        detailStatus = dateText;
                                      }

                                      return (
                                        <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: 12, padding: 12, background: "white" }}>
                                          {editingReminderId === r.id ? (
                                            <form 
                                              action={async (fd) => {
                                                await updateAircraftReminder(partnership.id, r.id, fd);
                                                setEditingReminderId(null);
                                              }} 
                                              onSubmit={(e) => {
                                                const target = e.currentTarget;
                                                const hoursVal = target.hoursInterval.value;
                                                const monthsVal = target.monthsInterval.value;
                                                if (!hoursVal && !monthsVal) {
                                                  e.preventDefault();
                                                  alert("Inserisci almeno una frequenza (ore di volo o temporale).");
                                                }
                                              }}
                                              className="grid" 
                                              style={{ gap: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--bg)" }}
                                            >
                                              <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>Modifica scadenza: {r.description}</div>
                                              
                                              <div className="grid grid-2" style={{ gap: 12 }}>
                                                <div className="field">
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Descrizione/Titolo</label>
                                                  <input className="input" name="description" defaultValue={r.description} required style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                </div>
                                                <div className="field">
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Note / Istruzioni</label>
                                                  <input className="input" name="notes" defaultValue={r.notes || ""} placeholder="Es. olio 15W50" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                </div>
                                              </div>

                                              <div className="grid grid-4" style={{ gap: 12 }}>
                                                <div className="field">
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Frequenza (ore di volo)</label>
                                                  <input className="input" name="hoursInterval" type="number" step="1" min="1" defaultValue={r.hoursInterval !== null ? Number(r.hoursInterval) : ""} placeholder="Es. 50" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                </div>
                                                <div className="field">
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Frequenza (mesi)</label>
                                                  <input className="input" name="monthsInterval" type="number" step="1" min="1" defaultValue={r.monthsInterval !== null ? r.monthsInterval : ""} placeholder="Es. 12" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                </div>
                                                <div className="field">
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Ultimo eseguito a (ore)</label>
                                                  <input className="input" name="lastCompletedHours" type="number" step="0.1" min="0" defaultValue={Number(r.lastCompletedHours)} required style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                </div>
                                                <div className="field">
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Ultimo eseguito il</label>
                                                  <input className="input" name="lastCompletedDate" type="date" defaultValue={r.lastCompletedDate ? new Date(r.lastCompletedDate).toISOString().substring(0, 10) : ""} style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                </div>
                                              </div>

                                              {a.reminders.filter((rem: any) => rem.id !== r.id).length > 0 && (
                                                <div style={{ marginTop: 8 }}>
                                                  <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 6, color: "var(--muted)" }}>
                                                    Questa manutenzione ne copre altre? (es. 100h copre 50h)
                                                  </label>
                                                  <div style={{ display: "flex", flexWrap: "wrap", gap: 16, backgroundColor: "white", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                                                    {a.reminders.filter((rem: any) => rem.id !== r.id).map((rem: any) => (
                                                      <label key={rem.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer", userSelect: "none" }}>
                                                        <input 
                                                          type="checkbox" 
                                                          name="covers" 
                                                          value={rem.id} 
                                                          defaultChecked={r.covers?.some((c: any) => c.id === rem.id)} 
                                                          onChange={(e) => handleCheckboxChange(e, a.reminders)}
                                                        />
                                                        <span>{rem.description}</span>
                                                      </label>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}

                                              <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                                                <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 11 }} type="button" onClick={() => setEditingReminderId(null)}>
                                                  Annulla
                                                </button>
                                                <SubmitButton style={{ padding: "4px 8px", fontSize: 11 }}>Salva</SubmitButton>
                                              </div>
                                            </form>
                                          ) : (
                                            <>
                                              <div className="between">
                                                <div>
                                                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{r.description}</div>
                                                  <div className="muted" style={{ fontSize: "0.8rem", marginTop: 4 }}>
                                                    {r.hoursInterval !== null && `Ogni ${Number(r.hoursInterval).toFixed(0)}h (Ultima: a ${Number(r.lastCompletedHours).toFixed(1)}h)`}
                                                    {r.hoursInterval !== null && r.monthsInterval !== null && ` o `}
                                                    {r.monthsInterval !== null && `Ogni ${r.monthsInterval} mes${r.monthsInterval === 1 ? 'e' : 'i'} (Ultima: il ${r.lastCompletedDate ? new Date(r.lastCompletedDate).toLocaleDateString("it-IT") : 'mai'})`}
                                                  </div>
                                                  {r.notes && (
                                                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", fontStyle: "italic", marginTop: 4 }}>
                                                      Note: {r.notes}
                                                    </div>
                                                  )}
                                                  {r.covers && r.covers.length > 0 && (
                                                    <div style={{ fontSize: "0.8rem", color: "var(--primary-strong)", marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                                                      <span style={{ fontSize: "11px", backgroundColor: "rgba(2, 132, 199, 0.1)", color: "#0284c7", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
                                                        Copre anche:
                                                      </span>
                                                      {r.covers.map((c: any) => (
                                                        <span key={c.id} className="pill" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                                          {c.description}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                  {r.coveredBy && r.coveredBy.length > 0 && (
                                                    <div style={{ fontSize: "0.8rem", color: "var(--muted)", marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                                                      <span style={{ fontSize: "11px", backgroundColor: "var(--bg)", color: "var(--text)", padding: "2px 6px", borderRadius: 4, fontWeight: 500 }}>
                                                        Coperto da:
                                                      </span>
                                                      {r.coveredBy.map((c: any) => (
                                                        <span key={c.id} className="pill" style={{ fontSize: "11px", padding: "2px 6px" }}>
                                                          {c.description}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="row" style={{ gap: 12 }}>
                                                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                                                    <span style={{ 
                                                      fontSize: "0.8rem", 
                                                      fontWeight: 600, 
                                                      padding: "4px 8px", 
                                                      borderRadius: 8, 
                                                      color: statusColor, 
                                                      backgroundColor: statusBg 
                                                    }}>
                                                      {statusText}
                                                    </span>
                                                    <span style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
                                                      {detailStatus}
                                                    </span>
                                                  </div>
                                                  {isAdmin && (
                                                    <div className="row" style={{ gap: 8 }}>
                                                      <button 
                                                        className="btn secondary" 
                                                        style={{ padding: "4px 8px", fontSize: 11 }}
                                                        type="button"
                                                        onClick={() => setLoggingReminderId(loggingReminderId === r.id ? null : r.id)}
                                                      >
                                                        Registra Esecuzione
                                                      </button>
                                                      <button 
                                                        className="btn secondary" 
                                                        style={{ padding: "4px 8px", fontSize: 11 }}
                                                        type="button"
                                                        onClick={() => setEditingReminderId(editingReminderId === r.id ? null : r.id)}
                                                      >
                                                        Modifica
                                                      </button>
                                                      <form 
                                                        action={deleteAircraftReminder.bind(null, partnership.id, r.id)}
                                                        onSubmit={(e) => {
                                                          if (!confirm("Sei sicuro di voler eliminare questa scadenza?")) {
                                                            e.preventDefault();
                                                          }
                                                        }}
                                                      >
                                                        <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 11, color: "var(--danger)" }} type="submit">
                                                          Elimina
                                                        </button>
                                                      </form>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>

                                              {loggingReminderId === r.id && (
                                                <form action={async (fd) => {
                                                  await logAircraftMaintenance(partnership.id, r.id, fd);
                                                  setLoggingReminderId(null);
                                                }} className="grid" style={{ gap: 8, marginTop: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 8, backgroundColor: "var(--bg)" }}>
                                                  <div style={{ fontWeight: 600, fontSize: "0.8rem" }}>Registra manutenzione effettuata: {r.description}</div>
                                                  <div className="grid grid-3" style={{ gap: 12 }}>
                                                    <div className="field">
                                                      <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Ore aereo all'esecuzione</label>
                                                      <input className="input" name="performedAtHours" type="number" step="0.1" min="0" defaultValue={a.totalHours.toFixed(1)} required style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                    </div>
                                                    <div className="field">
                                                      <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Data esecuzione</label>
                                                      <input className="input" name="date" type="date" defaultValue={new Date().toISOString().substring(0, 10)} required style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                    </div>
                                                    <div className="field">
                                                      <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Note / Intervento</label>
                                                      <input className="input" name="notes" placeholder="Es. olio 15W50" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                                    </div>
                                                  </div>
                                                  <div className="row" style={{ justifyContent: "flex-end", gap: 8, marginTop: 4 }}>
                                                    <button className="btn secondary" style={{ padding: "4px 8px", fontSize: 11 }} type="button" onClick={() => setLoggingReminderId(null)}>
                                                      Annulla
                                                    </button>
                                                    <SubmitButton style={{ padding: "4px 8px", fontSize: 11 }}>Salva</SubmitButton>
                                                  </div>
                                                </form>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      );
                                    })
                                  )}
                                </div>

                                {isAdmin && (
                                  <form action={addRecommendedReminders.bind(null, partnership.id, a.id)} onSubmit={(e) => {
                                    if (!confirm("Caricare le scadenze consigliate Rotax (gomme, 50h, 100h, 200h, 600h, 1200h, TBO)?")) {
                                      e.preventDefault();
                                    }
                                  }}>
                                    <SubmitButton className="btn secondary" style={{ padding: "4px 8px", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
                                      ⚙️ Aggiungi consigliate da Rotax
                                    </SubmitButton>
                                  </form>
                                )}

                                {isAdmin && (
                                  <form 
                                    action={addAircraftReminder.bind(null, partnership.id, a.id)} 
                                    onSubmit={(e) => {
                                      const target = e.currentTarget;
                                      const hoursVal = target.hoursInterval.value;
                                      const monthsVal = target.monthsInterval.value;
                                      if (!hoursVal && !monthsVal) {
                                        e.preventDefault();
                                        alert("Inserisci almeno una frequenza (ore di volo o temporale).");
                                      }
                                    }}
                                    className="grid" 
                                    style={{ gap: 12, padding: 12, border: "1px dashed var(--border)", borderRadius: 12, background: "white" }}
                                  >
                                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>➕ Nuova scadenza manutenzione</div>
                                    <div className="grid grid-2" style={{ gap: 12 }}>
                                      <div className="field">
                                        <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Descrizione/Titolo</label>
                                        <input className="input" name="description" placeholder="Es. Cambio Olio (50h)" required style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                      </div>
                                      <div className="field">
                                        <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Note / Istruzioni</label>
                                        <input className="input" name="notes" placeholder="Dettagli aggiuntivi" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                      </div>
                                    </div>
                                    <div className="grid grid-4" style={{ gap: 12 }}>
                                      <div className="field">
                                        <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Frequenza (ore di volo)</label>
                                        <input className="input" name="hoursInterval" type="number" step="1" min="1" placeholder="Es. 50" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                      </div>
                                      <div className="field">
                                        <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Frequenza (mesi)</label>
                                        <input className="input" name="monthsInterval" type="number" step="1" min="1" placeholder="Es. 12" style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                      </div>
                                      <div className="field">
                                        <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Ultimo eseguito a (ore)</label>
                                        <input className="input" name="lastCompletedHours" type="number" step="0.1" min="0" placeholder={`Opzionale (default: ${a.totalHours.toFixed(1)})`} style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                      </div>
                                      <div className="field">
                                        <label style={{ fontSize: "0.75rem", fontWeight: 500 }}>Ultimo eseguito il</label>
                                        <input className="input" name="lastCompletedDate" type="date" defaultValue={new Date().toISOString().substring(0, 10)} style={{ padding: "6px 8px", borderRadius: 8, fontSize: "0.85rem" }} />
                                      </div>
                                    </div>

                                    {a.reminders && a.reminders.length > 0 && (
                                      <div style={{ marginTop: 8 }}>
                                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: 6, color: "var(--muted)" }}>
                                          Questa manutenzione ne copre altre?
                                        </label>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, backgroundColor: "var(--bg)", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--border)" }}>
                                          {a.reminders.map((rem: any) => (
                                            <label key={rem.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.8rem", cursor: "pointer", userSelect: "none" }}>
                                              <input 
                                                type="checkbox" 
                                                name="covers" 
                                                value={rem.id} 
                                                onChange={(e) => handleCheckboxChange(e, a.reminders)}
                                              />
                                              <span>{rem.description}</span>
                                            </label>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    <div className="row" style={{ justifyContent: "flex-end" }}>
                                      <SubmitButton style={{ padding: "6px 12px", fontSize: 12 }}>Aggiungi scadenza</SubmitButton>
                                    </div>
                                  </form>
                                )}

                                {a.maintenanceLogs && a.maintenanceLogs.length > 0 && (
                                  <div style={{ marginTop: 8 }}>
                                    <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--muted)", borderBottom: "1px solid var(--border)", paddingBottom: 4, marginBottom: 8 }}>
                                      📜 Registro manutenzioni eseguite
                                    </div>
                                    <div style={{ overflowX: "auto" }}>
                                      <table className="table" style={{ fontSize: "0.8rem", width: "100%" }}>
                                        <thead>
                                          <tr>
                                            <th>Data</th>
                                            <th>Descrizione</th>
                                            <th>A ore</th>
                                            <th>Note</th>
                                            {isAdmin && <th>Azioni</th>}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {a.maintenanceLogs.map((log: any) => (
                                            <tr key={log.id}>
                                              <td>{new Date(log.date).toLocaleDateString("it-IT")}</td>
                                              <td><strong>{log.description}</strong></td>
                                              <td>{log.performedAtHours.toFixed(1)} h</td>
                                              <td>{log.notes || "—"}</td>
                                              {isAdmin && (
                                                <td>
                                                  <form 
                                                    action={deleteMaintenanceLog.bind(null, partnership.id, log.id)}
                                                    onSubmit={(e) => {
                                                      if (!confirm("Sei sicuro di voler eliminare questa registrazione storica?")) {
                                                        e.preventDefault();
                                                      }
                                                    }}
                                                  >
                                                    <button className="btn secondary" style={{ padding: "2px 6px", fontSize: 10, color: "var(--danger)" }} type="submit">
                                                      Elimina
                                                    </button>
                                                  </form>
                                                </td>
                                              )}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            )}

            {isAdmin && (
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
                <h3 style={{ marginTop: 0 }}>Aggiungi aereo</h3>
                <form action={addAircraft.bind(null, partnership.id)} className="grid">
                  <div className="grid grid-3">
                    <div className="field">
                      <label>Marche</label>
                      <input className="input" name="registration" required placeholder="Es. I-4150" />
                    </div>
                    <div className="field">
                      <label>Tipo</label>
                      <input className="input" name="type" required placeholder="Es. P92" />
                    </div>
                    <div className="field">
                      <label>Ore motore iniziali</label>
                      <input className="input" name="initialHours" type="number" step="0.1" min="0" defaultValue="0" required />
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
                  <div style={{ marginTop: 8, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <input type="checkbox" name="addRecommended" id="addRecommended" style={{ width: "auto", cursor: "pointer" }} />
                    <label htmlFor="addRecommended" style={{ fontSize: "0.85rem", fontWeight: 500, cursor: "pointer", userSelect: "none", color: "var(--text)" }}>
                      Pre-popola con le scadenze consigliate Rotax (gomme, 50h, 100h, 200h, 600h, 1200h, TBO)
                    </label>
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
              <table className="table fixed-costs-table">
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
                      <tr key={c.id} className="fixed-cost-row">
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
              <div className="flex-wrap-mobile" style={{ marginTop: 16, display: "flex", gap: 8, alignItems: "center", justifyContent: "flex-end" }}>
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
            <table className="table members-table">
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

            <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-start", width: "100%", maxWidth: "fit-content" }}>
              {/* Gruppo Select */}
              <div className="row" style={{ gap: 8, flexWrap: "nowrap", flexGrow: 1, minWidth: "250px" }}>
                <select className="select" value={reportMonth} onChange={e => setReportMonth(Number(e.target.value))} style={{ flexGrow: 1, minWidth: "150px", height: "40px" }}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const mName = new Date(0, i).toLocaleString('it-IT', { month: 'long' });
                    const capitalized = mName.charAt(0).toUpperCase() + mName.slice(1);
                    const isCurrent = i === new Date().getMonth() && reportYear === new Date().getFullYear();
                    return (
                      <option key={i} value={i}>
                        {capitalized}{isCurrent ? " (corrente)" : ""}
                      </option>
                    );
                  })}
                </select>

                <select className="select" value={reportYear} onChange={e => setReportYear(Number(e.target.value))} style={{ width: "90px", height: "40px" }}>
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const y = new Date().getFullYear() - 2 + idx;
                    return (
                      <option key={y} value={y}>{y}</option>
                    );
                  })}
                  {reportYear < new Date().getFullYear() - 2 && (
                    <option value={reportYear}>{reportYear}</option>
                  )}
                  {reportYear > new Date().getFullYear() + 2 && (
                    <option value={reportYear}>{reportYear}</option>
                  )}
                </select>
              </div>

              {/* Gruppo Pulsanti */}
              <div className="row" style={{ gap: 8, flexWrap: "nowrap", justifyContent: "center" }}>
                <button 
                  type="button" 
                  className="btn secondary" 
                  style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "36px", height: "40px" }}
                  onClick={() => {
                    if (reportMonth === 0) {
                      setReportMonth(11);
                      setReportYear(reportYear - 1);
                    } else {
                      setReportMonth(reportMonth - 1);
                    }
                  }}
                  title="Mese precedente"
                >
                  ◀
                </button>

                <button 
                  type="button" 
                  className="btn secondary" 
                  style={{ padding: "8px 16px", fontWeight: 600, height: "40px", display: "flex", alignItems: "center" }}
                  onClick={() => {
                    setReportMonth(new Date().getMonth());
                    setReportYear(new Date().getFullYear());
                  }}
                  title="Torna al mese corrente"
                >
                  Corrente
                </button>

                <button 
                  type="button" 
                  className="btn secondary" 
                  style={{ padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", minWidth: "36px", height: "40px" }}
                  onClick={() => {
                    if (reportMonth === 11) {
                      setReportMonth(0);
                      setReportYear(reportYear + 1);
                    } else {
                      setReportMonth(reportMonth + 1);
                    }
                  }}
                  title="Mese successivo"
                >
                  ▶
                </button>
              </div>
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

              <table className="table report-table">
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
                    <tr key={r.userId} className="report-row">
                      <td>
                        <strong>{r.fullName}</strong>
                        {r.userId === currentUserId && " (Tu)"}
                      </td>
                      <td>{r.flightsCount == 1 ? "1 volo" : `${r.flightsCount} voli`}</td>
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

            <table className="table transactions-table">
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
                  <tr key={t.id} className="transaction-row">
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
