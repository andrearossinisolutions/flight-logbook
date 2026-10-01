"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";

const POLL_INTERVAL_MS = 4_000;

interface MapPairingWatcherProps {
  code: string;
}

/**
 * Componente invisibile montato sulla pagina TV (/public-map): fa polling finché il telefono
 * che ha scansionato il QR non associa il proprio link mappa al codice di pairing, poi porta
 * la TV direttamente sulla mappa pubblica di quell'utente.
 */
export default function MapPairingWatcher({ code }: MapPairingWatcherProps) {
  const router = useRouter();
  const isPollingRef = useRef(false);

  useEffect(() => {
    async function poll() {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        const res = await fetch(`/api/map-pairing/${code}`, { cache: "no-store" });
        const data = await res.json();

        if (data.token) {
          router.replace(`/public-map/${data.token}` as Route);
          return;
        }

        if (data.expired) {
          // Il codice è scaduto: ricarichiamo la pagina per generarne uno nuovo e mostrare un QR valido
          router.refresh();
        }
      } catch {
        // Errore di rete transitorio: riprova al prossimo giro di polling
      } finally {
        isPollingRef.current = false;
      }
    }

    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [code, router]);

  return null;
}
