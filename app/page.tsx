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

export default async function HomePage() {
  const session = await getSessionFromCookie();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="landing-page">
      {/* Hero Section */}
      <section className="hero-section">
        <div className="container">
          <div className="pill hero-pill">✈️ Digital Flight Management</div>
          <h1 className="hero-title">
            Il tuo Logbook Digitale, <span className="text-gradient">evoluto.</span>
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
              <h3>Logbook Voli</h3>
              <p>Registra ogni decollo con precisione. Calcolo automatico dei costi basato su orametro o durata effettiva.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><UsersIcon size={28} /></div>
              <h3>Gestione Società</h3>
              <p>Amministra la tua società di volo: costi fissi, variabili e rendiconti mensili automatizzati per tutti i soci.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><MoneyBillIcon size={28} /></div>
              <h3>Controllo Costi</h3>
              <p>Tieni sempre d'occhio il tuo budget. Ricariche, anticipi e spese di manutenzione sotto controllo.</p>
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