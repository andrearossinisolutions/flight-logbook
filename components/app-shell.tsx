import React from "react";
import { Navbar } from "@/components/navbar";

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
    <>
      <Navbar />
      <main className="container" style={{ paddingTop: 8 }}>
        <div className="between no-print" style={{ marginBottom: 24, alignItems: "flex-start" }}>
          <div>
            <h1 style={{ marginBottom: 8, marginTop: 0 }}>{title}</h1>
            {subtitle ? <p className="muted" style={{ margin: 0 }}>{subtitle}</p> : null}
          </div>
        </div>
        {children}
      </main>
    </>
  );
}
