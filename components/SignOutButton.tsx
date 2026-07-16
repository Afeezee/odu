"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    try {
      await fetch("/api/auth/sign-out", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={signOut}
      disabled={busy}
      className={`text-sm px-3 py-1.5 rounded-md hover:bg-oui-gold/10 transition-colors disabled:opacity-40 ${className}`}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
