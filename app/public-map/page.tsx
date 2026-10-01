import { headers } from "next/headers";
import { randomBytes } from "crypto";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import ItalyOverviewMap from "@/components/italy-overview-map";
import MapPairingWatcher from "@/components/map-pairing-watcher";

export const dynamic = "force-dynamic";

const PAIRING_TTL_MS = 15 * 60 * 1000; // 15 minuti

async function getOrigin() {
  const h = await headers();
  const forwardedHost = h.get("x-forwarded-host");
  const host = forwardedHost || h.get("host");
  const protocol = h.get("x-forwarded-proto") || (process.env.NODE_ENV === "production" ? "https" : "http");
  if (host) {
    return `${protocol}://${host}`;
  }
  return process.env.APP_URL || "https://logbook.rossinisolutions.com";
}

async function createPairing() {
  // Pulizia pigra dei codici scaduti, per non far crescere la tabella all'infinito
  await prisma.mapPairing.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const pairing = await prisma.mapPairing.create({
    data: {
      code: randomBytes(16).toString("base64url"),
      expiresAt: new Date(Date.now() + PAIRING_TTL_MS),
    },
  });

  return pairing.code;
}

export default async function PublicMapLandingPage() {
  const [origin, pairingCode] = await Promise.all([getOrigin(), createPairing()]);
  const redirectPath = `/map?openShare=1&pairingCode=${pairingCode}`;
  const loginUrl = `${origin}/login?redirect=${encodeURIComponent(redirectPath)}`;
  const qrDataUrl = await QRCode.toDataURL(loginUrl, {
    width: 480,
    margin: 1,
    color: { dark: "#142033", light: "#ffffff" },
  });

  return (
    <div style={{ position: "relative", width: "100vw", height: "100vh", overflow: "hidden", background: "#0b1320" }}>
      <ItalyOverviewMap />
      <MapPairingWatcher code={pairingCode} />

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          pointerEvents: "none",
          padding: 24,
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            background: "rgba(255, 255, 255, 0.97)",
            borderRadius: 28,
            padding: "40px 48px",
            boxShadow: "0 24px 70px rgba(0, 0, 0, 0.35)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            maxWidth: "min(90vw, 560px)",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "2rem" }}>✈️🗺️</div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", color: "#142033" }}>Flight Logbook</h1>
          <p style={{ margin: 0, fontSize: "1.05rem", color: "#60708a", lineHeight: 1.5 }}>
            Inquadra il codice QR con il tuo telefono per accedere: questa schermata si aggiornerà
            automaticamente mostrando la tua mappa personale.
          </p>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR code per accedere e mostrare la propria mappa"
            style={{
              width: "min(70vw, 360px)",
              height: "min(70vw, 360px)",
              borderRadius: 16,
              border: "1px solid #d9e0ea",
            }}
          />

          <p style={{ margin: 0, fontSize: "0.85rem", color: "#9fb3cc" }}>
            Dopo l'accesso potrai generare o modificare il link della tua mappa pubblica.
          </p>
        </div>
      </div>
    </div>
  );
}
