"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(data.error ?? "Login fallito");
      return;
    }

    router.push("/logbook");
    router.refresh();
  }

  return (
    <main className="auth-shell">
      <div className="card auth-card">
        <div className="pill">Accesso</div>
        <h1>Accedi</h1>
        <p className="muted">Usa email e password del tuo account.</p>

        <form className="grid" onSubmit={onSubmit} style={{ marginTop: 16 }}>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input className="input" id="email" name="email" type="email" required />
          </div>

          <div className="field">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="password">Password</label>
              <Link href="/forgot-password" style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: 500 }}>
                Password dimenticata?
              </Link>
            </div>
            <input className="input" id="password" name="password" type="password" required />
          </div>

          {error ? <div className="error">{error}</div> : null}

          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Accesso..." : "Accedi"}
          </button>
        </form>

        <p className="muted" style={{ marginTop: 16 }}>
          Non hai un account? <Link href="/register" style={{ color: "var(--primary)", fontWeight: 500 }}>Registrati</Link>
        </p>
      </div>
    </main>
  );
}