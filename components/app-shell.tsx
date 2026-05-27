import React from "react";
import { Navbar } from "@/components/navbar";
import { getSessionFromCookie } from "@/lib/auth";

export async function AppShell({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const session = await getSessionFromCookie();
  const isLoggedIn = !!session;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} />
      <main className={`container ${className || ""}`} style={{ paddingTop: 8 }}>
        <div className="between no-print app-shell-header" style={{ marginBottom: 24, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginBottom: 8, marginTop: 0 }}>{title}</h1>
            {subtitle ? <p className="muted" style={{ margin: 0 }}>{subtitle}</p> : null}
          </div>
        </div>
        <div className="app-shell-content">
          {children}
        </div>
      </main>
    </>
  );
}
