"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { useState } from "react";
import { AirplaneIcon, LogOutIcon, SettingsIcon, UsersIcon } from "./icons";
import { version } from "../package.json";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const navItems = [
    { name: "Logbook", href: "/logbook", icon: AirplaneIcon },
    { name: "Società", href: "/societa", icon: UsersIcon },
    { name: "Impostazioni", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <header className="navbar-container">
      <nav className="navbar">
        <Link href="/logbook" className="navbar-brand">
          <div className="navbar-logo">
            <AirplaneIcon size={20} />
          </div>
          <div className="navbar-title-group">
            <span className="navbar-title">Flight Logbook</span>
            <span className="navbar-version">v{version}</span>
          </div>
        </Link>

        <div className="navbar-tabs">
          {navItems.map((item) => {
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
        </div>
      </nav>
    </header>
  );
}
