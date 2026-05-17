import React from "react";
import { Navbar } from "@/components/navbar";

export function AppShell({
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
  return (
    <>
      <Navbar />
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
