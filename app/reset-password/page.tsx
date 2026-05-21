"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(event.currentTarget);
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (!token) {
      setError("Token mancante. Assicurati di aver seguito il link corretto.");
      return;
    }

    if (password.length < 8) {
      setError("La password deve contenere almeno 8 caratteri.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Le password inserite non coincidono.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      setLoading(false);

      if (!response.ok) {
        setError(data.error ?? "Errore nel ripristino della password");
        return;
      }

      setSuccess("Password ripristinata con successo!");
    } catch (err) {
      setLoading(false);
      setError("Errore di rete. Riprova più tardi.");
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <div className="card auth-card">
          <div className="pill" style={{ background: "#fecaca", color: "#b91c1c" }}>Errore</div>
          <h1 style={{ marginTop: 8 }}>Token Mancante</h1>
          <p className="muted">Il link di ripristino non è valido o è incompleto.</p>
          <div style={{ marginTop: 24 }}>
            <Link href="/forgot-password" className="btn" style={{ textDecoration: "none", display: "inline-block", textAlign: "center", width: "100%" }}>
              Richiedi un nuovo link
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="card auth-card">
        <div className="pill" style={{ background: "#e0f2fe", color: "#0369a1" }}>Sicurezza</div>
        <h1 style={{ marginTop: 8 }}>Nuova Password</h1>
        <p className="muted">Imposta la tua nuova password d'accesso.</p>

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
            <p className="muted" style={{ fontSize: "0.9rem", lineHeight: 1.5 }}>Ora puoi accedere al tuo account con la nuova password.</p>
            <div style={{ marginTop: 24 }}>
              <Link href="/login" className="btn" style={{ textDecoration: "none", display: "inline-block", textAlign: "center", width: "100%" }}>
                Accedi ora
              </Link>
            </div>
          </div>
        ) : (
          <form className="grid" onSubmit={onSubmit} style={{ marginTop: 24 }}>
            <div className="field">
              <label htmlFor="password">Nuova Password</label>
              <input className="input" id="password" name="password" type="password" required placeholder="Almeno 8 caratteri..." />
            </div>

            <div className="field">
              <label htmlFor="confirmPassword">Conferma Nuova Password</label>
              <input className="input" id="confirmPassword" name="confirmPassword" type="password" required placeholder="Ripeti la password..." />
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
              {loading ? "Aggiornamento in corso..." : "Salva nuova password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <main className="auth-shell">
        <div className="card auth-card" style={{ textAlign: "center" }}>
          <p className="muted">Caricamento in corso...</p>
        </div>
      </main>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
