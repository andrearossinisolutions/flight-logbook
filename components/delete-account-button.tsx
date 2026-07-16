"use client";

import { useState } from "react";

export default function DeleteAccountButton() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Sei sicuro di voler eliminare il tuo account? Questa azione avvierà la procedura di eliminazione definitiva inviando un'email di conferma al tuo indirizzo registrato. L'eliminazione diventerà effettiva SOLO dopo aver cliccato sul link contenuto nell'email."
    );

    if (!confirmed) {
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/auth/delete-account-request", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setMessage({
          type: "success",
          text: "Email di conferma inviata! Controlla la tua casella di posta per completare l'eliminazione definitiva.",
        });
      } else {
        setMessage({
          type: "error",
          text: data.error || "Si è verificato un errore durante l'invio della richiesta.",
        });
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: "Impossibile contattare il server. Riprova più tardi.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {message && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: "0.9rem",
            fontWeight: 700,
            border: message.type === "success" ? "1px solid #bbf7d0" : "1px solid #fecaca",
            backgroundColor: message.type === "success" ? "#f0fdf4" : "#fef2f2",
            color: message.type === "success" ? "#15803d" : "#b91c1c",
          }}
        >
          {message.text}
        </div>
      )}

      <button
        type="button"
        onClick={handleDelete}
        disabled={loading}
        className="btn"
        style={{
          backgroundColor: "#dc2626",
          borderColor: "#dc2626",
          color: "#ffffff",
          cursor: loading ? "not-allowed" : "pointer",
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? "Richiesta in corso..." : "Elimina Account..."}
      </button>
    </div>
  );
}
