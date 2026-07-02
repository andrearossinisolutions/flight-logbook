import { AppShell } from "@/components/app-shell";
import { ChangelogList } from "./changelog-list";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog",
  description: "Cronologia degli aggiornamenti, nuove funzionalità e bugfix rilasciati in Flight Logbook.",
};

export default function ChangelogPage() {
  return (
    <AppShell
      title="Changelog"
      subtitle="La cronologia degli aggiornamenti e delle novità di Flight Logbook."
    >
      <ChangelogList />
    </AppShell>
  );
}
