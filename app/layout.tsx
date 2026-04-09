import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Flight Logbook",
  description: "Starter project per logbook voli e gestione costi.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
