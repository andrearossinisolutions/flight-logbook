import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="auth-shell" style={{ padding: "40px 20px", display: "block", minHeight: "100vh", overflowY: "auto" }}>
      <div className="card" style={{ maxWidth: "800px", margin: "0 auto", padding: "40px" }}>
        <Link href="/" style={{ display: "inline-block", color: "var(--primary)", fontWeight: 500, marginBottom: 24, textDecoration: "none" }}>
          ← Torna alla Home
        </Link>
        <div className="pill" style={{ marginBottom: 12 }}>Privacy Policy</div>
        <h1 style={{ marginTop: 0, marginBottom: 16 }}>Informativa sulla Privacy</h1>
        <p className="muted" style={{ fontSize: "0.9rem", marginBottom: 32 }}>Ultimo aggiornamento: 16 Luglio 2026</p>

        <div style={{ lineHeight: 1.7, color: "#374151" }}>
          <p>
            Benvenuto su <strong>Flight Logbook</strong>. La tua privacy è fondamentale per noi. Questa informativa descrive come raccogliamo, utilizziamo e proteggiamo i tuoi dati personali quando utilizzi la nostra applicazione.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>1. Titolare del Trattamento dei Dati</h2>
          <p>
            Il Titolare del Trattamento è <strong>Andrea Rossini</strong>, con sede a Cervignano d'Adda, LO, Italia.<br />
            Per qualsiasi domanda in merito alla presente informativa o all'esercizio dei tuoi diritti, puoi contattarci all'indirizzo email: <a href="mailto:andrea@rossinisolutions.com" style={{ color: "var(--primary)" }}>andrea@rossinisolutions.com</a>.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>2. Dati Raccolti</h2>
          <p>
            Raccogliamo ed elaboriamo le seguenti categorie di dati necessari per fornirti il servizio:
          </p>
          <ul>
            <li><strong>Dati di Account:</strong> Nome, cognome, indirizzo email e password (memorizzata in modo sicuro tramite hashing unidirezionale).</li>
            <li><strong>Dati di Profilo e Impostazioni:</strong> Aeroporto base di preferenza, tariffe di noleggio/istruttore predefinite e scadenze dei titoli aeronautici (visite mediche, fonia, ecc.).</li>
            <li><strong>Dati del Logbook di Volo:</strong> Marche e tipo di aereo, orari di blocco, aeroporti di partenza/destinazione, compagni di volo o istruttori, costi e note di volo.</li>
            <li><strong>Dati di Società (Partnership):</strong> Se crei o partecipi a una società di volo, i dati relativi alla condivisione di voli, aerei, prenotazioni e movimenti finanziari (cassa comune) associati alla società.</li>
          </ul>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>3. Finalità del Trattamento</h2>
          <p>
            I tuoi dati vengono trattati esclusivamente per le seguenti finalità:
          </p>
          <ul>
            <li>Fornire le funzionalità del logbook di volo digitale (calcolo ore, compilazione automatica origini, monitoraggio scadenze).</li>
            <li>Inviare il servizio settimanale di briefing meteo personalizzato per il weekend (basato sulla tua base di volo impostata).</li>
            <li>Consentire la gestione amministrativa e la condivisione all'interno di società di volo da te autorizzate.</li>
            <li>Garantire la sicurezza del tuo account e prevenire utilizzi illeciti o fraudolenti.</li>
          </ul>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>4. Conservazione dei Dati e Sicurezza</h2>
          <p>
            I dati sono memorizzati in database sicuri e protetti da accessi non autorizzati. I tuoi dati personali vengono conservati per tutto il tempo in cui il tuo account è attivo. 
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>5. I Tuoi Diritti (GDPR)</h2>
          <p>
            Ai sensi del Regolamento Europeo (GDPR), hai il diritto di accedere ai tuoi dati, chiederne la rettifica, la portabilità o la limitazione. 
            In particolare, hai il diritto all'<strong>eliminazione definitiva dei tuoi dati</strong>. Puoi esercitare questo diritto in qualsiasi momento e in completa autonomia accedendo alle Impostazioni del tuo profilo sul nostro sito, sezione "Eliminazione Permanente Account". La cancellazione comporterà la rimozione a cascata irreversibile di ogni dato ad esso collegato.
          </p>

          <h2 style={{ fontSize: "1.3rem", marginTop: 32, marginBottom: 12, color: "#111827" }}>6. Modifiche alla presente Informativa</h2>
          <p>
            Ci riserviamo il diritto di modificare questa informativa sulla privacy. Qualsiasi aggiornamento verrà pubblicato su questa pagina con la data di ultimo aggiornamento modificata.
          </p>
        </div>
      </div>
    </main>
  );
}
