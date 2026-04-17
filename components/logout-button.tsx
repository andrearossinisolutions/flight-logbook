"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button className="btn" style={{ background: "#b91c1c", color: "white" }} onClick={onClick} disabled={loading}>
      {loading ? "Uscita..." : "Logout"}
    </button>
  );
}
