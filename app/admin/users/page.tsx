"use client";
import { useEffect, useMemo, useState } from "react";
import { StatCard } from "@/components/StatCard";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: "user" | "admin";
  createdAt: string;
  sessionCount: number;
  questionCount: number;
  lastActiveAt: string | null;
}

interface MeResponse {
  user: { id: string } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "user">("all");
  const [sortBy, setSortBy] = useState<"joined" | "questions" | "sessions" | "lastActive">("joined");
  const [myId, setMyId] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, meRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/auth/me"),
      ]);
      if (uRes.status === 401 || uRes.status === 403) {
        window.location.href = `/sign-in?next=${encodeURIComponent("/admin/users")}`;
        return;
      }
      const uJson = await uRes.json();
      if (!uRes.ok) throw new Error(uJson.error || `HTTP ${uRes.status}`);
      const meJson = (await meRes.json()) as MeResponse;
      setUsers(uJson.users as AdminUser[]);
      setMyId(meJson.user?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users
      .filter((user) => {
        if (roleFilter !== "all" && user.role !== roleFilter) return false;
        if (!q) return true;
        return (
          user.email.toLowerCase().includes(q) ||
          (user.name?.toLowerCase().includes(q) ?? false) ||
          user.role.toLowerCase().includes(q)
        );
      })
      .sort((left, right) => compareUsers(left, right, sortBy));
  }, [users, query, roleFilter, sortBy]);

  const summary = useMemo(() => {
    const adminCount = users.filter((user) => user.role === "admin").length;
    const active7d = users.filter((user) => isWithinDays(user.lastActiveAt, 7)).length;
    const active30d = users.filter((user) => isWithinDays(user.lastActiveAt, 30)).length;
    const new30d = users.filter((user) => isWithinDays(user.createdAt, 30)).length;
    const questions = users.reduce((total, user) => total + user.questionCount, 0);
    return { adminCount, active7d, active30d, new30d, questions };
  }, [users]);

  const changeRole = async (u: AdminUser, newRole: "user" | "admin") => {
    if (newRole === u.role) return;
    setPending(u.id);
    setError(null);
    const prev = users;
    setUsers((all) => all.map((x) => (x.id === u.id ? { ...x, role: newRole } : x)));
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    } catch (err) {
      setUsers(prev);
      setError(err instanceof Error ? err.message : "role change failed");
    } finally {
      setPending(null);
    }
  };

  const deleteUser = async (u: AdminUser) => {
    if (!confirm(`Delete ${u.email}? Their conversations will be kept but detached from their account.`)) return;
    setPending(u.id);
    setError(null);
    const prev = users;
    setUsers((all) => all.filter((x) => x.id !== u.id));
    try {
      const res = await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
    } catch (err) {
      setUsers(prev);
      setError(err instanceof Error ? err.message : "delete failed");
    } finally {
      setPending(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-oui-muted">Users</div>
          <h1 className="mt-2 font-serif text-3xl">Control who can access the admin area</h1>
          <p className="mt-2 max-w-2xl text-sm text-oui-muted">
            Promote or demote users, review who is actually active, and remove stale accounts without losing conversation history.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-oui-muted">
          <FilterChip label="Total" value={loading ? "..." : users.length} />
          <FilterChip label="Admins" value={loading ? "..." : summary.adminCount} />
          <FilterChip label="Active 30d" value={loading ? "..." : summary.active30d} />
        </div>
      </div>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Users"
          value={users.length}
          sublabel={loading ? undefined : `${summary.new30d} joined in the last 30 days`}
          loading={loading}
        />
        <StatCard
          label="Admins"
          value={summary.adminCount}
          sublabel={loading ? undefined : `${Math.max(users.length - summary.adminCount, 0)} standard accounts`}
          loading={loading}
        />
        <StatCard
          label="Active Users"
          value={summary.active7d}
          sublabel={loading ? undefined : `${summary.active30d} active in 30 days`}
          loading={loading}
        />
        <StatCard
          label="Tracked Questions"
          value={summary.questions}
          sublabel="Total user prompts linked to accounts"
          loading={loading}
        />
      </section>

      <section className="mt-6 flex flex-col gap-3 rounded-2xl border border-oui-border bg-oui-surface p-4 dark:border-oui-border-dark dark:bg-oui-surface-dark lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search email, name, role..."
            className="w-full rounded-full border border-oui-border bg-oui-bg pl-9 pr-3 py-2 text-sm outline-none focus:border-oui-gold dark:border-oui-border-dark dark:bg-oui-bg-dark"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-oui-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as "all" | "admin" | "user")}
            className="rounded-full border border-oui-border bg-oui-bg px-3 py-2 text-sm outline-none focus:border-oui-gold dark:border-oui-border-dark dark:bg-oui-bg-dark"
          >
            <option value="all">All roles</option>
            <option value="admin">Admins only</option>
            <option value="user">Users only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "joined" | "questions" | "sessions" | "lastActive")}
            className="rounded-full border border-oui-border bg-oui-bg px-3 py-2 text-sm outline-none focus:border-oui-gold dark:border-oui-border-dark dark:bg-oui-bg-dark"
          >
            <option value="joined">Newest first</option>
            <option value="questions">Most questions</option>
            <option value="sessions">Most sessions</option>
            <option value="lastActive">Recently active</option>
          </select>
        </div>
      </section>

      <div className="mt-3 text-xs text-oui-muted">
        Admin allowlist entries from the server config cannot be demoted until they are removed from <strong>ADMIN_EMAILS</strong>.
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-oui-border bg-oui-surface dark:border-oui-border-dark dark:bg-oui-surface-dark">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="border-b border-oui-border bg-oui-bg/50 dark:border-oui-border-dark dark:bg-oui-bg-dark/30">
              <tr className="text-left text-[10px] uppercase tracking-widest text-oui-muted">
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Last Active</Th>
                <Th className="text-right">Conversations</Th>
                <Th className="text-right">Questions</Th>
                <Th>Joined</Th>
                <Th className="text-right pr-4">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-oui-border last:border-0 dark:border-oui-border-dark">
                    <td colSpan={7} className="p-3">
                      <div className="h-8 animate-pulse rounded bg-oui-border/40 dark:bg-oui-border-dark/40" />
                    </td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-oui-muted">
                    {users.length === 0 ? "No users yet." : "No users match your search."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const isMe = u.id === myId;
                  const isPending = pending === u.id;
                  return (
                    <tr
                      key={u.id}
                      className="border-b border-oui-border transition-colors hover:bg-oui-gold/5 last:border-0 dark:border-oui-border-dark"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-oui-navy text-sm font-semibold text-white">
                            {(u.name || u.email).trim()[0]?.toUpperCase() ?? "?"}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate flex items-center gap-2">
                              {u.name || <span className="text-oui-muted">—</span>}
                              {isMe && <span className="text-[10px] uppercase tracking-wider text-oui-muted">(you)</span>}
                            </div>
                            <div className="text-xs text-oui-muted truncate">{u.email}</div>
                            <div className="mt-1 text-[11px] text-oui-muted">
                              {u.lastActiveAt ? (isWithinDays(u.lastActiveAt, 7) ? "Active this week" : `Last active ${relative(u.lastActiveAt)}`) : "No activity yet"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="inline-flex rounded-full border border-oui-border bg-oui-bg p-0.5 dark:border-oui-border-dark dark:bg-oui-bg-dark">
                          {(["user", "admin"] as const).map((role) => {
                            const active = u.role === role;
                            return (
                              <button
                                key={role}
                                type="button"
                                disabled={isMe || isPending}
                                onClick={() => changeRole(u, role)}
                                className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider transition ${
                                  active
                                    ? role === "admin"
                                      ? "bg-oui-maroon text-white dark:bg-oui-gold dark:text-oui-navy"
                                      : "bg-oui-navy text-white"
                                    : "text-oui-muted"
                                } disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                        {isPending && <div className="mt-1 text-[11px] text-oui-muted">Saving role…</div>}
                      </td>
                      <td className="p-3 text-oui-muted">{u.lastActiveAt ? relative(u.lastActiveAt) : "Never"}</td>
                      <td className="p-3 text-right tabular-nums">{u.sessionCount}</td>
                      <td className="p-3 text-right tabular-nums">{u.questionCount}</td>
                      <td className="p-3 text-oui-muted">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="p-3 text-right pr-4">
                        <button
                          onClick={() => deleteUser(u)}
                          disabled={isMe || isPending}
                          title={isMe ? "You cannot delete your own account" : "Delete user"}
                          className="text-xs text-red-600 dark:text-red-400 hover:bg-red-500/10 rounded-md px-2 py-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={`p-3 font-medium ${className}`}>{children}</th>;
}

function FilterChip({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-full border border-oui-border bg-oui-surface px-3 py-1.5 dark:border-oui-border-dark dark:bg-oui-surface-dark">
      <span>{label}</span>
      <span className="ml-2 font-semibold text-foreground">{value}</span>
    </div>
  );
}

function compareUsers(
  left: AdminUser,
  right: AdminUser,
  sortBy: "joined" | "questions" | "sessions" | "lastActive",
) {
  if (sortBy === "questions") return right.questionCount - left.questionCount;
  if (sortBy === "sessions") return right.sessionCount - left.sessionCount;
  if (sortBy === "lastActive") return getTime(right.lastActiveAt) - getTime(left.lastActiveAt);
  return getTime(right.createdAt) - getTime(left.createdAt);
}

function getTime(iso: string | null) {
  return iso ? new Date(iso).getTime() : 0;
}

function isWithinDays(iso: string | null, days: number) {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

function relative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
