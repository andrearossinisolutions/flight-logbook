import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getSessionFromCookie } from "@/lib/auth";
import { redirect } from "next/navigation";
import { 
  AirplaneIcon, 
  UsersIcon, 
  DashboardIcon, 
  ArrowRightIcon,
  MoneyBillIcon,
  CalendarIcon
} from "@/components/icons";

import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Digital Flight Logbook | Gestione Voli & Società di Volo",
  description: "Il logbook voli digitale professionale per piloti e associazioni. Organizza la flotta, monitora le scadenze dei motori, gestisci la cassa comune e calcola i rendiconti mensili dei soci.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Flight Logbook",
  "description": "Digital Flight Logbook per piloti e software di gestione per società e associazioni di volo.",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "All",
  "offers": {
    "@type": "Offer",
    "price": "0.00",
    "priceCurrency": "EUR"
  },
  "author": {
    "@type": "Organization",
    "name": "Rossini Solutions",
    "url": "https://logbook.rossinisolutions.com"
  }
};

const CheckIcon = () => (
  <svg 
    className="showcase-check-icon" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    strokeWidth="2.5" 
    style={{ width: 18, height: 18, color: "#10b981", flexShrink: 0, marginTop: 4 }}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default async function HomePage() {
  const session = await getSessionFromCookie();

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    if (user) {
      redirect("/logbook");
    } else {
      redirect("/api/auth/logout?redirect=/");
    }
  }


  return (
    <main className="landing-page">
      {/* JSON-LD Structured Data for SEO Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="pill hero-pill">✈️ Digital Flight Logbook & Management</div>
          <h1 className="hero-title">
            Il tuo <span className="text-gradient">Digital Flight Logbook</span>, evoluto.
          </h1>
          <p className="hero-subtitle">
            Gestisci i tuoi voli, tieni traccia dei costi e coordina la tua società di volo 
            in un'unica piattaforma intuitiva e professionale.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-lg btn-glow" href="/register">
              Inizia Ora Gratis <ArrowRightIcon size={20} />
            </Link>
            <Link className="btn btn-lg secondary" href="/login">
              Accedi al tuo account
            </Link>
          </div>
        </div>
      </section>

      {/* Features Showcase Section */}
      <section className="showcase-section">
        <div className="container">
          <div className="showcase-header">
            <div className="pill hero-pill" style={{ display: 'inline-block', margin: '0 auto 16px' }}>✨ Esplora le funzionalità</div>
            <h2 className="showcase-section-title">Una piattaforma completa per il volo</h2>
            <p className="showcase-section-subtitle">
              Sia che tu sia un pilota privato o il gestore di un'associazione di volo,
              troverai tutti gli strumenti necessari per la tua passione.
            </p>
          </div>

          <div className="showcase-content-rows">

            {/* Feature 5 */}
            <div className="showcase-row">
              <div className="showcase-text">
                <span className="showcase-badge">Pianificazione Meteo VFR</span>
                <h3>Briefing Meteo & Density Altitude</h3>
                <p>
                  Ottieni i bollettini METAR e TAF decodificati lungo la rotta inserita. Il sistema calcola 
                  automaticamente la Density Altitude di partenza e arrivo per prevenire rischi legati a 
                  ridotte prestazioni di decollo o atterraggio.
                </p>
                <ul className="showcase-features-list">
                  <li>
                    <CheckIcon />
                    <span>Decodifica automatica di vento, visibilità, QNH e copertura nuvolosa</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Geocodifica dinamica di città e aviosuperfici non-ICAO</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Calcolo in tempo reale di Pressure Altitude e Density Altitude con avvisi</span>
                  </li>
                </ul>
                <div style={{ marginTop: 24 }}>
                  <Link href="/briefing" className="btn" style={{ display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                    Prova il Briefing Meteo <ArrowRightIcon size={16} />
                  </Link>
                </div>
              </div>
              <div className="showcase-visual">
                <div className="browser-mockup">
                  <div className="browser-header">
                    <div className="browser-dots">
                      <div className="browser-dot red"></div>
                      <div className="browser-dot yellow"></div>
                      <div className="browser-dot green"></div>
                    </div>
                    <div className="browser-address">logbook.rossinisolutions.com/briefing</div>
                  </div>
                  <div className="browser-content">
                    <Image 
                      src="/images/screenshots/weather.png" 
                      alt="Briefing Meteo e Density Altitude" 
                      width={800}
                      height={500}
                      className="browser-image"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Feature 1 */}
            <div className="showcase-row">
              <div className="showcase-text">
                <span className="showcase-badge">Dashboard & Registro</span>
                <h3>Tutti i tuoi voli a portata di mano</h3>
                <p>
                  Un'interfaccia moderna per registrare le attività di volo personali e societarie. 
                  Monitora a colpo d'occhio le ore volate negli ultimi mesi, visualizza le statistiche 
                  dettagliate ed accedi rapidamente ai widget del tuo profilo.
                </p>
                <ul className="showcase-features-list">
                  <li>
                    <CheckIcon />
                    <span>Statistiche dinamiche (ultimo volo, ore complessive, tendenze semestrali)</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Registro movimenti chiaro con ordinamento cronologico</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Stato avanzamento bozze e inserimento facilitato</span>
                  </li>
                </ul>
              </div>
              <div className="showcase-visual">
                <div className="browser-mockup">
                  <div className="browser-header">
                    <div className="browser-dots">
                      <div className="browser-dot red"></div>
                      <div className="browser-dot yellow"></div>
                      <div className="browser-dot green"></div>
                    </div>
                    <div className="browser-address">logbook.rossinisolutions.com/dashboard</div>
                  </div>
                  <div className="browser-content">
                    <Image 
                      src="/images/screenshots/dashboard.png" 
                      alt="Dashboard e Registro Voli" 
                      width={800}
                      height={500}
                      className="browser-image"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="showcase-row">
              <div className="showcase-text">
                <span className="showcase-badge">Pianificazione Flotta</span>
                <h3>Calendario Prenotazioni Intelligente</h3>
                <p>
                  Prenota gli aerei dell'hangar societario in modo semplice. Il sistema rileva 
                  automaticamente eventuali conflitti orari o sovrapposizioni, impedendo doppi 
                  inserimenti e garantendo la massima trasparenza.
                </p>
                <ul className="showcase-features-list">
                  <li>
                    <CheckIcon />
                    <span>Form di inserimento rapido con selezione velivoli, data e ora</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Controllo conflitti di prenotazione real-time con messaggi di errore chiari</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Gestione note per ogni sessione di volo pianificata</span>
                  </li>
                </ul>
              </div>
              <div className="showcase-visual">
                <div className="browser-mockup">
                  <div className="browser-header">
                    <div className="browser-dots">
                      <div className="browser-dot red"></div>
                      <div className="browser-dot yellow"></div>
                      <div className="browser-dot green"></div>
                    </div>
                    <div className="browser-address">logbook.rossinisolutions.com/bookings</div>
                  </div>
                  <div className="browser-content">
                    <Image 
                      src="/images/screenshots/booking.png" 
                      alt="Calendario Prenotazioni Velivoli" 
                      width={800}
                      height={500}
                      className="browser-image"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="showcase-row">
              <div className="showcase-text">
                <span className="showcase-badge">Collaborazione Club</span>
                <h3>La tua Community di Volo, connessa</h3>
                <p>
                  Comunica e coordinati con tutti i soci. La bacheca messaggi centralizzata permette di 
                  scrivere note visibili a tutto il gruppo, mentre il pannello laterale riassume gli 
                  ultimi utilizzi dei mezzi e le prenotazioni future.
                </p>
                <ul className="showcase-features-list">
                  <li>
                    <CheckIcon />
                    <span>Bacheca messaggi interattiva in tempo reale</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Widget di sintesi degli utilizzi recenti dei velivoli</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Avvisi immediati sulle manutenzioni flotta in corso</span>
                  </li>
                </ul>
              </div>
              <div className="showcase-visual">
                <div className="browser-mockup">
                  <div className="browser-header">
                    <div className="browser-dots">
                      <div className="browser-dot red"></div>
                      <div className="browser-dot yellow"></div>
                      <div className="browser-dot green"></div>
                    </div>
                    <div className="browser-address">logbook.rossinisolutions.com/bulletin</div>
                  </div>
                  <div className="browser-content">
                    <Image 
                      src="/images/screenshots/bulletin.png" 
                      alt="Bacheca Messaggi Società" 
                      width={800}
                      height={500}
                      className="browser-image"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="showcase-row">
              <div className="showcase-text">
                <span className="showcase-badge">Manutenzione flotta</span>
                <h3>Sicurezza ed efficienza al primo posto</h3>
                <p>
                  Amministra la flotta di volo tenendo traccia delle scadenze critiche del motore e della cellula. 
                  Configura manutenzioni periodiche (es. cambio olio 50h, ispezione 100h) e visualizza lo stato 
                  di ogni mezzo in tempo reale.
                </p>
                <ul className="showcase-features-list">
                  <li>
                    <CheckIcon />
                    <span>Gestione parametri orari ed economici (costo orario del volo)</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Tracciamento delle scadenze basato su ore motore reali</span>
                  </li>
                  <li>
                    <CheckIcon />
                    <span>Allarmi visivi per manutenzioni urgenti o scadute</span>
                  </li>
                </ul>
              </div>
              <div className="showcase-visual">
                <div className="browser-mockup">
                  <div className="browser-header">
                    <div className="browser-dots">
                      <div className="browser-dot red"></div>
                      <div className="browser-dot yellow"></div>
                      <div className="browser-dot green"></div>
                    </div>
                    <div className="browser-address">logbook.rossinisolutions.com/maintenance</div>
                  </div>
                  <div className="browser-content">
                    <Image 
                      src="/images/screenshots/maintenance.png" 
                      alt="Gestione Flotta e Manutenzioni" 
                      width={800}
                      height={500}
                      className="browser-image"
                    />
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Stats/Social Proof (Optional style) */}
      <section className="cta-footer">
        <div className="container card glass-dark">
          <div className="row between stack-mobile">
            <div>
              <h2 style={{ color: "#fff", marginBottom: 8 }}>Pronto per il decollo?</h2>
              <p style={{ color: "rgba(255,255,255,0.7)" }}>Unisciti ai piloti che hanno già digitalizzato la loro passione.</p>
            </div>
            <Link className="btn btn-lg" href="/register">
              Crea il tuo profilo <ArrowRightIcon size={20} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}