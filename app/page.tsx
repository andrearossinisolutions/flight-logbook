import type { Metadata } from "next";
import Link from "next/link";
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

export default async function HomePage() {
  const session = await getSessionFromCookie();

  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.userId }
    });
    if (user) {
      redirect("/dashboard");
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

      {/* Features Grid */}
      <section className="features-section">
        <div className="container">
          <div className="grid grid-3">
            <div className="feature-card">
              <div className="feature-icon"><AirplaneIcon size={28} /></div>
              <h3>Digital Flight Logbook</h3>
              <p>Registra ogni decollo con precisione. Il tuo logbook voli digitale personale con calcolo automatico dei costi basato su orametro o durata.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><UsersIcon size={28} /></div>
              <h3>Logbook Società & Hangar</h3>
              <p>Amministra la tua associazione o società di volo: costi fisso-variabili, scadenze dei velivoli e rendiconti mensili automatici per i soci.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><MoneyBillIcon size={28} /></div>
              <h3>Cassa e Controllo Costi</h3>
              <p>Tieni sempre sotto controllo il bilancio del club. Ricariche crediti dei piloti, spese anticipate di carburante e manutenzione.</p>
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