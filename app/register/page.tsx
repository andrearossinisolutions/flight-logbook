"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Registrazione fallita");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <div className="card auth-card">
        <div className="pill">Nuovo account</div>
        <h1>Crea utente</h1>
        <p className="muted">Registrazione protetta con email e password.</p>

        <form className="grid" onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="fullName">Nome</label>
            <input className="input" id="fullName" name="fullName" />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input className="input" id="password" name="password" type="password" minLength={8} required />
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Creazione..." : "Crea account"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16 }}>
          Hai già un account? <Link href="/login">Accedi</Link>
        </p>
      </div>
    </main>
  );
}
