import React from "react";
import { Navbar } from "@/components/navbar";
import { getSessionFromCookie } from "@/lib/auth";

export async function AppShell({
  title,
  subtitle,
  children,
  className,
  fluid = false,
  hideHeader = false,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  fluid?: boolean;
  hideHeader?: boolean;
}) {
  const session = await getSessionFromCookie();
  const isLoggedIn = !!session;

  return (
    <>
      <Navbar isLoggedIn={isLoggedIn} />
      <main 
        className={fluid ? (className || "") : `container ${className || ""}`} 
        style={{ paddingTop: fluid ? 0 : 8 }}
      >
        {!hideHeader && (
          <div className={fluid ? "container" : ""} style={fluid ? { paddingBottom: 0 } : undefined}>
            <div className="between no-print app-shell-header" style={{ marginBottom: fluid ? 16 : 24, alignItems: "flex-start" }}>
              <div>
                <h1 style={{ marginBottom: 8, marginTop: 0 }}>{title}</h1>
                {subtitle ? <p className="muted" style={{ margin: 0 }}>{subtitle}</p> : null}
              </div>
            </div>
          </div>
        )}
        <div className={fluid ? "" : "app-shell-content"}>
          {children}
        </div>
      </main>
    </>
  );
}
