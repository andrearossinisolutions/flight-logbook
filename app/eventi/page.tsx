import { requireUser } from "@/lib/require-user";
import { AppShell } from "@/components/app-shell";
import { fetchAllEvents, EventItem, cleanEventTitle } from "@/lib/events";
import { CalendarIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function EventiPage() {
  const user = await requireUser();
  
  let events: EventItem[] = [];
  let errorMsg: string | null = null;
  
  try {
    events = await fetchAllEvents();
  } catch (err) {
    console.error("Errore nel caricamento degli eventi:", err);
    errorMsg = "Non è stato possibile caricare gli eventi in questo momento. Verifica la tua connessione di rete e riprova.";
  }

  return (
    <AppShell 
      title="Eventi & Raduni" 
      subtitle="Raduni, manifestazioni ed eventi di volo raccolti dalle principali fonti aeronautiche."
    >
      <div className="eventi-page-container">
        {/* Info panel */}
        <div className="card info-banner" style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px" }}>
          <CalendarIcon size={24} style={{ fontSize: 24 }} />
          <div>
            <h3 style={{ margin: "0 0 4px 0", fontSize: "1.05rem" }}>Aggiornamenti in tempo reale</h3>
            <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
              Questa sezione aggrega in tempo reale gli eventi e i raduni provenienti da fonti aeronautiche come <strong>Piloti di Classe</strong>. I dati vengono salvati in cache per ottimizzare le prestazioni.
            </p>
          </div>
        </div>

        {errorMsg ? (
          <div className="card text-center" style={{ padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 40 }}>⚠️</span>
            <p style={{ margin: 0, fontWeight: "medium", color: "var(--danger)", maxWidth: 500 }}>
              {errorMsg}
            </p>
          </div>
        ) : events.length === 0 ? (
          <div className="card text-center" style={{ padding: "60px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 40 }}>🛩️</span>
            <h3 style={{ margin: 0 }}>Nessun evento trovato</h3>
            <p className="muted" style={{ margin: 0, maxWidth: 500 }}>
              Non abbiamo trovato raduni o eventi attivi nei feed monitorati. Torna a controllare più tardi!
            </p>
          </div>
        ) : (
          <div className="grid grid-3 stack-mobile" style={{ gap: 24, marginTop: 24 }}>
            {events.map((event, idx) => {
              const displayTitle = cleanEventTitle(event.title);
              return (
                <div 
                  key={event.link || idx} 
                  className="card event-card"
                >
                  {/* Image Section */}
                  <div className="event-card-image-wrapper">
                    {event.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img 
                        src={event.imageUrl} 
                        alt={displayTitle}
                        className="event-card-image"
                      />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyItems: "center", justifyContent: "center", color: "var(--muted)", backgroundColor: "var(--bg)" }}>
                        <span style={{ fontSize: 48 }}>✈️</span>
                      </div>
                    )}
                    {/* Badge Source */}
                    <span className="pill event-card-source-badge">
                      {event.sourceName}
                    </span>
                  </div>

                  {/* Content Section */}
                  <div className="event-card-content">
                    {/* Date badge */}
                    {event.eventDateLabel && (
                      <div style={{ display: "flex" }}>
                        <span className="pill event-card-date-badge">
                          📅 {event.eventDateLabel}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <h2 className="event-card-title">
                      {displayTitle}
                    </h2>

                    {/* Description excerpt */}
                    <p className="event-card-description">
                      {event.description}
                    </p>

                    {/* Button */}
                    <div>
                      <a 
                        href={event.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="btn secondary event-card-button"
                      >
                        Leggi su {event.sourceName} ↗
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
