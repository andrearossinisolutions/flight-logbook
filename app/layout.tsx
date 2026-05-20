import "./globals.css";
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";

export const metadata: Metadata = {
  title: "Flight Logbook",
  description: "Starter project per logbook voli e gestione costi.",
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
