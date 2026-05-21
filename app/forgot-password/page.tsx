"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const email = formData.get("email");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Errore durante la richiesta");
        return;
      }

      setSuccess(data.message ?? "Link di ripristino inviato!");
    } catch (err) {
      setLoading(false);
      setError("Errore di rete. Riprova più tardi.");
    }
  }

  return (
    <main className="auth-shell">
      <div className="card auth-card">
        <div className="pill" style={{ background: "#e0f2fe", color: "#0369a1" }}>Sicurezza</div>
        <h1 style={{ marginTop: 8 }}>Password dimenticata</h1>
        <p className="muted">Inserisci la tua email per ricevere un link di ripristino password.</p>

        {success ? (
          <div style={{ marginTop: 24, textAlign: "center" }}>
            <div className="success" style={{ 
              background: "rgba(16, 185, 129, 0.1)", 
              color: "#10b981", 
              padding: "12px 16px", 
              borderRadius: "12px", 
              fontSize: "0.95rem", 
              marginBottom: 16 
            }}>
              {success}
            </div>
            <p className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>
              Controlla la tua posta elettronica. Se non trovi l'email entro pochi minuti, verifica anche nella cartella spam.
            </p>
            <div style={{ marginTop: 24 }}>
              <Link href="/login" className="btn" style={{ textDecoration: "none", display: "inline-block", textAlign: "center", width: "100%" }}>
                Torna al Login
              </Link>
            </div>
          </div>
        ) : (
          <form className="grid" onSubmit={onSubmit} style={{ marginTop: 24 }}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input className="input" id="email" name="email" type="email" required placeholder="Inserisci la tua email..." />
            </div>

            {error ? (
              <div className="error" style={{ 
                background: "rgba(239, 68, 68, 0.1)", 
                color: "#ef4444", 
                padding: "12px 16px", 
                borderRadius: "12px", 
                fontSize: "0.95rem" 
              }}>
                {error}
              </div>
            ) : null}

            <button className="btn" type="submit" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? "Invio in corso..." : "Invia link di ripristino"}
            </button>

            <p className="muted" style={{ marginTop: 16, textAlign: "center" }}>
              Ricordi la password? <Link href="/login" style={{ color: "var(--primary)", fontWeight: 500 }}>Accedi</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
