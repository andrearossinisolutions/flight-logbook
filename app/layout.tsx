import "./globals.css";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: {
    default: "Flight Logbook - Digital Flight Logbook & Gestione Società di Volo",
    template: "%s | Flight Logbook"
  },
  description: "Piattaforma e logbook digitale per piloti di aerei. Gestisci ore di volo, scadenze manutenzione velivoli, cassa e quote spese della tua società di volo o hangar.",
  keywords: [
    "Flight Logbook", 
    "Digital Flight Logbook", 
    "Logbook Società", 
    "logbook digitale pilota", 
    "registro voli aereo", 
    "gestione aerei", 
    "costi hangar", 
    "manutenzione aereo ore",
    "cassa piloti"
  ],
  metadataBase: new URL(process.env.APP_URL || "https://logbook.rossinisolutions.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Flight Logbook - Digital Flight Logbook & Gestione Società di Volo",
    description: "Il logbook digitale evoluto per piloti ed associazioni di volo. Gestisci voli, scadenze, cassa e quote soci.",
    url: "https://logbook.rossinisolutions.com",
    siteName: "Flight Logbook",
    locale: "it_IT",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Flight Logbook - Digital Flight Logbook & Gestione Società di Volo",
    description: "Il logbook digitale evoluto per piloti ed associazioni di volo.",
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <NextTopLoader color="#1f6f5b" showSpinner={false} />
        {children}
      </body>
    </html>
  );
}
