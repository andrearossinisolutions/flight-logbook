"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AirplaneIcon,
  UsersIcon,
  SettingsIcon,
  ArrowRightIcon,
  CheckIcon,
} from "@/components/icons";

type OnboardingPath = "RENTAL" | "PARTNERSHIP_ADMIN" | "PARTNERSHIP_MEMBER" | null;

const cardStyle = {
  background: "#ffffff",
  padding: "48px 32px",
  borderRadius: "32px",
  border: "2px solid #e2e8f0",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  boxShadow: "0 10px 30px -10px rgba(0, 0, 0, 0.1)",
  cursor: "pointer",
  textAlign: "center" as const,
  transition: "all 0.3s ease",
};

const buttonStyle = {
  marginTop: "32px",
  padding: "14px 40px",
  background: "#0284c7",
  color: "#ffffff",
  borderRadius: "16px",
  fontWeight: "700",
  fontSize: "1.1rem",
  width: "100%",
  textAlign: "center" as const,
  border: "none",
  boxShadow: "0 4px 12px rgba(2, 132, 199, 0.3)",
};

export function OnboardingFlow({ userName }: { userName: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [path, setPath] = useState<OnboardingPath>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [instructorRate, setInstructorRate] = useState("80");
  const [rentalRate, setRentalRate] = useState("150");
  const [rentalReg, setRentalReg] = useState("");
  const [rentalType, setRentalType] = useState("P92");

  const [psName, setPsName] = useState("");
  const [psReg, setPsReg] = useState("");
  const [psType, setPsType] = useState("P92");
  const [psFuel, setPsFuel] = useState("0");
  const [psMaint, setPsMaint] = useState("0");
  const [psFund, setPsFund] = useState("0");
  const [fixedCosts, setFixedCosts] = useState<{ description: string; amount: string; period: string }[]>([
    { description: "Hangaraggio", amount: "0", period: "MONTHLY" },
    { description: "Assicurazione", amount: "0", period: "YEARLY" },
  ]);

  const totalSteps = 6;

  const nextStep = () => setStep((s) => Math.min(s + 1, totalSteps));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubmit = async () => {
    setLoading(true);
    const config: any = {
      instructorRate: Number(instructorRate),
      rentalRate: Number(rentalRate),
    };

    if (path === "RENTAL" && rentalReg) {
      config.aircraft = {
        registration: rentalReg,
        type: rentalType,
        hourlyCost: Number(rentalRate),
      };
    } else if (path === "PARTNERSHIP_ADMIN") {
      config.partnership = {
        name: psName,
        aircraft: {
          registration: psReg,
          type: psType,
          hourlyFuelCost: Number(psFuel),
          hourlyMaintCost: Number(psMaint),
          hourlyEngineFund: Number(psFund),
        },
        fixedCosts: fixedCosts
          .filter(fc => Number(fc.amount) > 0)
          .map(fc => ({ ...fc, amount: Number(fc.amount) })),
      };
    }

    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, config }),
      });

      if (res.ok) {
        setStep(6); // Success step
      } else {
        alert("Si è verificato un errore durante il salvataggio.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="onboarding-step fade-in">
            <div className="onboarding-icon-main">
              <AirplaneIcon size={48} />
            </div>
            <h1>Benvenuto, {userName || "Pilota"}!</h1>
            <p>
              Flight Logbook è il tuo assistente personale per gestire voli, costi e società.
              In pochi passaggi configureremo l'app su misura per le tue esigenze.
            </p>
            <button className="btn btn-lg" onClick={nextStep}>
              Iniziamo <ArrowRightIcon size={20} />
            </button>
          </div>
        );

      case 2:
        return (
          <div className="onboarding-step fade-in">
            <h1>Che tipo di pilota sei?</h1>
            <p>Scegli il profilo che meglio descrive la tua attività principale.</p>

            <div className="onboarding-grid">
              <div
                className="onboarding-card"
                style={cardStyle}
                onClick={() => { setPath("RENTAL"); nextStep(); }}
              >
                <div className="onboarding-card-icon" style={{ marginBottom: 20 }}><AirplaneIcon size={32} /></div>
                <h3>Pilota Noleggiatore</h3>
                <p>Noleggio aerei dell'AeroClub e voglio tracciare i miei voli e ricariche.</p>
                <div className="onboarding-card-button" style={buttonStyle}>Scegli</div>
              </div>

              <div
                className="onboarding-card"
                style={cardStyle}
                onClick={() => { setPath("PARTNERSHIP_ADMIN"); nextStep(); }}
              >
                <div className="onboarding-card-icon" style={{ marginBottom: 20 }}><UsersIcon size={32} /></div>
                <h3>Amministratore Società</h3>
                <p>Gestisco un aereo in società e voglio tenere i conti per tutti i soci.</p>
                <div className="onboarding-card-button" style={buttonStyle}>Scegli</div>
              </div>

              <div
                className="onboarding-card"
                style={cardStyle}
                onClick={() => { setPath("PARTNERSHIP_MEMBER"); nextStep(); }}
              >
                <div className="onboarding-card-icon" style={{ marginBottom: 20 }}><SettingsIcon size={32} /></div>
                <h3>Socio di Società</h3>
                <p>Partecipo a una società esistente gestita da qualcun altro.</p>
                <div className="onboarding-card-button" style={buttonStyle}>Scegli</div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="onboarding-step fade-in">
            <h1>{path === "PARTNERSHIP_ADMIN" ? "Dati della Società" : "Configurazione rapida"}</h1>
            <p>
              {path === "PARTNERSHIP_ADMIN"
                ? "Iniziamo definendo il nome della società e l'aereo principale."
                : "Inserisci i dati base per iniziare subito a registrare i tuoi voli."}
            </p>

            <div className="onboarding-form card glass">
              {path === "RENTAL" && (
                <div className="grid">
                  <div className="field">
                    <label>Aereo abituale (Marche)</label>
                    <input type="text" className="input" placeholder="I-ABCD" value={rentalReg} onChange={e => setRentalReg(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Tariffa Noleggio (€/h)</label>
                    <input type="number" className="input" value={rentalRate} onChange={e => setRentalRate(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Tariffa Istruttore (€/h)</label>
                    <input type="number" className="input" value={instructorRate} onChange={e => setInstructorRate(e.target.value)} />
                  </div>
                </div>
              )}

              {path === "PARTNERSHIP_ADMIN" && (
                <div className="grid">
                  <div className="field">
                    <label>Nome della Società</label>
                    <input type="text" className="input" placeholder="Es. Fly Group" value={psName} onChange={e => setPsName(e.target.value)} />
                  </div>
                  <div className="grid grid-2">
                    <div className="field">
                      <label>Marche Aereo</label>
                      <input type="text" className="input" placeholder="I-1234" value={psReg} onChange={e => setPsReg(e.target.value)} />
                    </div>
                    <div className="field">
                      <label>Modello</label>
                      <input type="text" className="input" value={psType} onChange={e => setPsType(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {path === "PARTNERSHIP_MEMBER" && (
                <div className="onboarding-info">
                  <p>
                    Ottimo! Per partecipare a una società, chiedi all'amministratore di aggiungerti
                    tramite la sezione "Società". Nel frattempo, impostiamo la tua tariffa istruttore predefinita.
                  </p>
                  <div className="field">
                    <label>Tariffa Istruttore AeroClub (€/h)</label>
                    <input type="number" className="input" value={instructorRate} onChange={e => setInstructorRate(e.target.value)} />
                  </div>
                </div>
              )}

              <div className="row" style={{ marginTop: 24, gap: 12 }}>
                <button className="btn secondary" onClick={prevStep} disabled={loading}>Indietro</button>
                {path === "PARTNERSHIP_ADMIN" ? (
                  <button className="btn" onClick={nextStep} disabled={!psName || !psReg}>Avanti</button>
                ) : (
                  <button className="btn" onClick={handleSubmit} disabled={loading}>Completa Setup</button>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        if (path !== "PARTNERSHIP_ADMIN") return null;
        return (
          <div className="onboarding-step fade-in">
            <h1>Costi Fissi</h1>
            <p>Definisci le spese ricorrenti della società (Hangar, Assicurazione, ecc.).</p>

            <div className="onboarding-form card glass">
              <div className="grid">
                {fixedCosts.map((fc, idx) => (
                  <div
                    key={idx}
                    className="grid grid-3"
                    style={{
                      alignItems: "end",
                      gap: 8,
                      borderBottom: idx === fixedCosts.length - 1 ? "none" : "1px solid #f1f5f9",
                      paddingBottom: idx === fixedCosts.length - 1 ? 0 : 16,
                      marginBottom: idx === fixedCosts.length - 1 ? 0 : 8
                    }}
                  >
                    <div className="field">
                      <label>Descrizione</label>
                      <input
                        className="input"
                        value={fc.description}
                        onChange={e => {
                          const newCosts = [...fixedCosts];
                          newCosts[idx].description = e.target.value;
                          setFixedCosts(newCosts);
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>Importo (€)</label>
                      <input
                        type="number"
                        className="input"
                        value={fc.amount}
                        onChange={e => {
                          const newCosts = [...fixedCosts];
                          newCosts[idx].amount = e.target.value;
                          setFixedCosts(newCosts);
                        }}
                      />
                    </div>
                    <div className="field">
                      <label>Periodo</label>
                      <select
                        className="select"
                        value={fc.period}
                        onChange={e => {
                          const newCosts = [...fixedCosts];
                          newCosts[idx].period = e.target.value;
                          setFixedCosts(newCosts);
                        }}
                      >
                        <option value="MONTHLY">Mensile</option>
                        <option value="YEARLY">Annuale</option>
                        <option value="ONCE">Una tantum</option>
                      </select>
                    </div>
                  </div>
                ))}
                <button
                  className="btn secondary"
                  style={{ width: "fit-content" }}
                  onClick={() => setFixedCosts([...fixedCosts, { description: "", amount: "0", period: "MONTHLY" }])}
                >
                  + Aggiungi costo
                </button>
              </div>

              <div className="row" style={{ marginTop: 24, gap: 12 }}>
                <button className="btn secondary" onClick={prevStep}>Indietro</button>
                <button className="btn" onClick={nextStep}>Avanti</button>
              </div>
            </div>
          </div>
        );

      case 5:
        if (path !== "PARTNERSHIP_ADMIN") return null;
        return (
          <div className="onboarding-step fade-in">
            <h1>Costi Variabili</h1>
            <p>Inserisci i costi orari stimati per il funzionamento dell'aereo.</p>
            <p className="muted" style={{ fontSize: "0.9rem", marginBottom: "32px" }}>
              Se utilizzate la tecnica del riempimento autonomo a fine volo, e non prevedete l'accantonamento orario per manutenzione, potete lasciare tutti i campi a 0.
            </p>

            <div className="onboarding-form card glass">
              <div className="grid">
                <div className="muted" style={{ marginBottom: 8, fontSize: 14 }}>Costi orari stimati:</div>
                <div className="grid grid-3">
                  <div className="field">
                    <label>Carburante (€/h)</label>
                    <input type="number" className="input" value={psFuel} onChange={e => setPsFuel(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Manutenzione (€/h)</label>
                    <input type="number" className="input" value={psMaint} onChange={e => setPsMaint(e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Fondo Motore (€/h)</label>
                    <input type="number" className="input" value={psFund} onChange={e => setPsFund(e.target.value)} />
                  </div>
                </div>
              </div>

              <div className="row" style={{ marginTop: 32, gap: 12 }}>
                <button className="btn secondary" onClick={prevStep} disabled={loading}>Indietro</button>
                <button className="btn" onClick={handleSubmit} disabled={loading}>
                  {loading ? "Salvataggio..." : "Completa Setup"}
                </button>
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="onboarding-step fade-in">
            <div className="onboarding-success-icon">
              <CheckIcon size={48} />
            </div>
            <h1>Configurazione completata!</h1>
            <p>Sei pronto per decollare. Abbiamo preparato la tua dashboard personalizzata.</p>
            <button className="btn btn-lg" onClick={() => router.push("/dashboard")}>
              Vai alla Dashboard <ArrowRightIcon size={20} />
            </button>
          </div>
        );
    }
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-progress">
        <div
          className="onboarding-progress-bar"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        ></div>
      </div>
      <div className="onboarding-content">
        {renderStep()}
      </div>
    </div>
  );
}
