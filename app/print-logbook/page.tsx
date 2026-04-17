import Link from "next/link";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/prisma";
import {
  formatDateDisplay,
  formatTimeDisplay,
  minutesToHoursMinutes,
} from "@/lib/utils";
import { PrintButton } from "@/components/print-button";

export default async function PrintLogbookPage() {
  const user = await requireUser();

  const flights = await prisma.movement.findMany({
    where: {
      userId: user.id,
      type: "FLIGHT",
      isDraft: false,
    },
    include: {
      flight: true,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  return (
    <main className="container print-page">
      <div className="between no-print" style={{ marginBottom: 24 }}>
        <div>
          <div className="pill">Flight Logbook</div>
          <h1 style={{ marginBottom: 8 }}>Logbook stampabile</h1>
          <p className="muted">
            Elenco voli confermati con i dettagli operativi utili alla stampa.
          </p>
        </div>
        <div className="row">
          <Link className="btn secondary" href="/dashboard">
            Dashboard
          </Link>
          <PrintButton />
        </div>
      </div>

      <div className="card print-card">
        <div className="between" style={{ marginBottom: 20 }}>
          <div>
            <h2 style={{ margin: 0 }}>Registro voli</h2>
            <div className="muted" style={{ marginTop: 8 }}>
              {user.fullName ?? user.email}
            </div>
          </div>
          <div className="muted" style={{ textAlign: "right" }}>
            <div>Totale voli: {flights.length}</div>
            <div>Generato il {formatDateDisplay(new Date())} {formatTimeDisplay(new Date())}</div>
          </div>
        </div>

        <table className="table print-table">
          <thead>
            <tr>
              <th>Data/Ora</th>
              <th>Tipo</th>
              <th>Aeromobile</th>
              <th colSpan={2}>Tratta</th>
              <th>Persone</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {flights.length === 0 ? (
              <tr>
                <td colSpan={10} className="muted">
                  Nessun volo confermato da stampare.
                </td>
              </tr>
            ) : null}

            {flights.map((item) => (
              <tr key={item.id}>
                <td>
                  {formatDateDisplay(item.date)}<br />
                  {formatTimeDisplay(item.date)}
                </td>
                <td>{flightType(item.flight)}</td>
                <td>
                  {item.flight?.aircraftRegistration ?? "I-4150"}
                </td>
                <td>
                  { (item.flight?.takeoffPlace != null || item.flight?.arrivalPlace != null) &&
                    <>Partenza: {item.flight?.takeoffPlace ?? "?"}<br /></> }
                  { (item.flight?.engineOn != null || item.flight?.engineOff != null) &&
                    <>Accensione: {formatOptionalDateTime(item.flight?.engineOn)}<br /></> }
                  { (item.flight?.hobbsStartMinutes != null || item.flight?.hobbsEndMinutes != null) &&
                    <>Oram.Inizio: {formatOptionalHobbs(item.flight?.hobbsStartMinutes)}<br /></> }
                  Temp.Tot.: {minutesToHoursMinutes(item.flight?.durationMinutes ?? 0)}
                </td>
                <td>
                  { (item.flight?.arrivalPlace != null || item.flight?.engineOff != null) &&
                    <>Arrivo: {item.flight?.arrivalPlace ?? "?"}<br /></> }
                  { (item.flight?.engineOff != null) &&
                    <>Spegnimento: {formatOptionalDateTime(item.flight?.engineOff)}<br /></> }
                  { (item.flight?.hobbsEndMinutes != null) &&
                    <>Oram.Fine: {formatOptionalHobbs(item.flight?.hobbsEndMinutes)}<br /></> }
                </td>
                <td>
                  {item.flight?.instructorName && item.flight?.instructorMinutes > 0 ? (
                    <div>
                      Istruttore: {item.flight.instructorName}<br />
                      Temp.Istr.: {minutesToHoursMinutes(item.flight.instructorMinutes)}
                    </div>
                  ) : null}
                  {!(item.flight?.instructorName && item.flight?.instructorMinutes > 0) && item.flight?.passengerName ? (
                    <div>Passeggero: {item.flight.passengerName}</div>
                  ) : null}
                  {!(item.flight?.instructorName && item.flight?.instructorMinutes > 0) && !item.flight?.passengerName ? "—" : null}
                </td>
                <td>{item.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function flightType(flight: any, short = false) {
  if (flight.instructorMinutes == flight.durationMinutes) {
    return "Lezione";
  } else if (flight.instructorMinutes > 0 && flight.instructorMinutes < flight.durationMinutes) {
    return <>Noleggio<br />con lezione</>;
  } else if (flight.passengerName) {
    return <>Noleggio<br />con passeggero</>;
  }
  return "Noleggio";
}

function formatOptionalDateTime(date: Date | null | undefined) {
  if (!date) return "—";
  return `${formatDateDisplay(date)} ${formatTimeDisplay(date)}`;
}

function formatOptionalHobbs(value: number | null | undefined) {
  if (value == null) return "—";
  return minutesToHoursMinutes(value);
}
