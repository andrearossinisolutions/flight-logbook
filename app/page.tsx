import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionFromCookie } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionFromCookie();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="container" style={{ paddingTop: 48 }}>
      <div className="card" style={{ padding: 32 }}>
        <div className="pill">Flight Logbook Starter</div>
        <h1 style={{ fontSize: "2.4rem", marginBottom: 12 }}>
          Logbook voli + contabilità costi
        </h1>
        <p className="muted" style={{ maxWidth: 720, lineHeight: 1.6 }}>
          Starter project Next.js con SQLite, Prisma e autenticazione email/password.
          Supporta registrazione utente, login, impostazioni tariffe, ricariche e
          inserimento voli con calcolo costi da orametro o da durata manuale.
        </p>
        <div className="row" style={{ marginTop: 24 }}>
          <Link className="btn" href="/register">
            Crea account
          </Link>
          <Link className="btn secondary" href="/login">
            Accedi
          </Link>
        </div>
      </div>
    </main>
  );
}