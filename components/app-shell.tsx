import Link from "next/link";
import type { Route } from "next";
import { LogoutButton } from "@/components/logout-button";

export function AppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="container">
      <div className="between" style={{ marginBottom: 24 }}>
        <div>
          <div className="pill">Flight Logbook</div>
          <h1 style={{ marginBottom: 8 }}>{title}</h1>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        <div className="row">
          <Link className="btn secondary" href="/dashboard">
            Dashboard
          </Link>
          <Link className="btn secondary" href="/settings">
            Impostazioni
          </Link>
          <LogoutButton />
        </div>
      </div>
      {children}
    </main>
  );
}
