"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { AirplaneIcon, BriefingIcon, LogOutIcon, MapIcon, SettingsIcon, UsersIcon } from "./icons";
import { version } from "../package.json";

export function Navbar({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    if (!window.confirm("Sei sicuro di voler uscire?")) {
      return;
    }
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { name: "Logbook", href: "/logbook", icon: AirplaneIcon },
    { name: "Briefing", href: "/briefing", icon: BriefingIcon },
    { name: "Mappa", href: "/map", icon: MapIcon },
    { name: "Società", href: "/societa", icon: UsersIcon },
    { name: "Impostazioni", href: "/settings", icon: SettingsIcon },
  ];


  return (
    <header className="navbar-container">
      <nav className="navbar">
        <Link href={isLoggedIn ? "/logbook" : "/"} className="navbar-brand">
          <div className="navbar-logo">
            <AirplaneIcon size={20} />
          </div>
          <div className="navbar-title-group">
            <span className="navbar-title">Flight Logbook</span>
            <span className="navbar-version">v{version}</span>
          </div>
        </Link>

        <div className="navbar-tabs">
          {isLoggedIn && navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/logbook" && pathname?.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href as Route}
                className={`navbar-tab ${isActive ? "active" : ""}`}
                title={item.name}
              >
                <Icon size={18} />
                <span className="navbar-tab-text">{item.name}</span>
              </Link>
            );
          })}
        </div>

        <div className="navbar-actions">
          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="navbar-logout-btn"
              title="Esci dal profilo"
              aria-label="Logout"
            >
              <LogOutIcon size={18} />
              <span className="navbar-logout-text">{loggingOut ? "..." : "Esci"}</span>
            </button>
          ) : (
            <div className="navbar-public-actions" style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <Link href="/login" className="btn secondary" style={{ padding: "6px 14px", fontSize: "0.88rem", height: "auto", minHeight: "initial", border: "1px solid var(--border)" }}>
                Accedi
              </Link>
              <Link href="/register" className="btn" style={{ padding: "6px 14px", fontSize: "0.88rem", height: "auto", minHeight: "initial" }}>
                Registrati
              </Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
