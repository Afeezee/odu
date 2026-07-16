"use client";

import { useEffect, useState } from "react";
import type { AdminStats } from "@/lib/admin-dashboard";

export function useAdminStats(nextPath: string) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (res.status === 401 || res.status === 403) {
          window.location.href = `/sign-in?next=${encodeURIComponent(nextPath)}`;
          return;
        }

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
        if (alive) setStats(json as AdminStats);
      } catch (err) {
        if (alive) setError(err instanceof Error ? err.message : "unknown error");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [nextPath]);

  return { stats, error, loading };
}