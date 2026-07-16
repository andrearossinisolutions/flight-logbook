import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="auth-shell" style={{ padding: "40px 20px", display: "block", minHeight: "100vh", overflowY: "auto" }}>
      <div className="card" style={{ maxWidth: "800px", margin: "0 auto", padding: "40px" }}>
        <Link href="/" style={{ display: "inline-block", color: "var(--primary)", fontWeight: 500, marginBottom: 24, textDecoration: "none" }}>
          ← Torna alla Home
        </Link>
        <div className="pill" style={{ marginBottom: 12 }}>Termini di Servizio</div>
        <h1 style={{ marginTop: 0, marginBottom: 16 }}>Termini e Condizioni di Utilizzo</h1>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: 32 }}>Ultimo aggiornamento: 16 Luglio 2026</p>

        <div style={{ lineHeight: 1.7, color: "#374151" }}>
          <p>
            Ti preghiamo di leggere attentamente questi Termini e Condizioni prima di utilizzare <strong>Flight Logbook</strong>. Accedendo o registrando un account sul nostro servizio, accetti di essere vincolato dai presenti termini.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>1. Descrizione del Servizio</h2>
          <p>
            Flight Logbook è uno strumento digitale destinato all'annotazione e al monitoraggio delle attività di volo personali e alla gestione amministrativa interna di società di volo, inclusa la visualizzazione di cartine meteo SWLL e la generazione di stime e indici meteo VFR (es. Weekend Weather Digest).
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>2. Responsabilità Aeronautica e Prevenzione Rischi</h2>
          <p style={{ backgroundColor: "#fffbeb", borderLeft: "4px solid #f59e0b", padding: "12px 16px", borderRadius: 4 }}>
            <strong>IMPORTANTE:</strong> Flight Logbook, inclusi tutti i calcoli meteorologici o gli indici di volo (VFR Flyability Index) forniti in-app o via email, ha finalità **puramente informative ed estimative**. Questi strumenti **non costituiscono in alcun modo pianificazione ufficiale di volo** e non sostituiscono i canali istituzionali (es. ENAV, bollettini meteo aeronautici ufficiali, NOTAM). È responsabilità esclusiva e inderogabile del pilota in comando (PIC) verificare le condizioni meteorologiche reali, le limitazioni degli spazi aerei e l'efficienza del velivolo prima del decollo.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>3. Registrazione ed Account</h2>
          <p>
            Per utilizzare il servizio è necessario creare un account fornendo informazioni veritiere e complete. Sei responsabile della riservatezza delle credenziali di acesso al tuo account. Ci riserviamo il diritto di sospendere o cancellare account che violino le presenti condizioni o arrechino disturbo al servizio.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>4. Limitazione di Responsabilità</h2>
          <p>
            Nei limiti massimi consentiti dalla legge applicabile, Andrea Rossini non sarà responsabile per danni diretti, indiretti, incidentali, speciali o consequenziali derivanti dall'uso o dall'impossibilità di usare il servizio, inclusi errori nei dati del logbook o stime errate delle condizioni meteo.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>5. Contatti</h2>
          <p>
            Per qualsiasi chiarimento in merito ai presenti Termini, puoi contattarci all'indirizzo email: <a href="mailto:andrea@rossinisolutions.com" style={{ color: "var(--primary)" }}>andrea@rossinisolutions.com</a>.
          </p>
        </div>
      </div>
    </main>
  );
}
