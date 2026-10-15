import React from "react";
import { Navbar } from "@/components/navbar";
import { getSessionFromCookie } from "@/lib/auth";

export async function AppShell({
  title,
  subtitle,
  children,
  className,
  headerActions,
  titleAdornment,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  titleAdornment?: React.ReactNode;
}) {
  const session = await getSessionFromCookie();
  const isLoggedIn = !!session;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} />
      <main className={`container ${className || ""}`} style={{ paddingTop: 8 }}>
        <div className="between no-print app-shell-header" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: headerActions ? 16 : 24, alignItems: headerActions ? "center" : "flex-start" }}>
          <div style={headerActions ? { flex: "0 0 auto" } : undefined}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 16, flexWrap: "wrap", whiteSpace: "nowrap" }}>
              <h1 style={{ marginBottom: subtitle ? 8 : 0, marginTop: 0 }}>{title}</h1>
              {titleAdornment}
            </div>
            {subtitle ? <p className="muted" style={{ margin: 0 }}>{subtitle}</p> : null}
          </div>
          {headerActions ? (
            <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", flex: "1 1 auto", minWidth: 0, justifyContent: "flex-end" }}>
              {headerActions}
            </div>
          ) : null}
        </div>
        <div className="app-shell-content">
          {children}
        </div>
      </main>
    </>
  );
}
