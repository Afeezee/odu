"use client";

import Link from "next/link";
import { MessagesChart } from "@/components/MessagesChart";
import { StatCard } from "@/components/StatCard";
import { useAdminStats } from "./useAdminStats";

const ACTIVITY_SERIES = [
  { key: "messages", label: "messages", color: "#7A1F2E" },
  { key: "userMessages", label: "questions", color: "#D4A017" },
  { key: "sessions", label: "sessions", color: "#102B5C" },
];

export default function AdminDashboard() {
  const { stats, error, loading } = useAdminStats("/admin");
  const last30d = stats ? summarise(stats.dailyActivity) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8">
      <section className="relative overflow-hidden rounded-[28px] border border-oui-border/70 bg-[radial-gradient(circle_at_top_left,rgba(212,160,23,0.18),transparent_34%),linear-gradient(135deg,rgba(10,30,66,0.98),rgba(122,31,46,0.95))] px-6 py-7 text-white shadow-sm">
        <div className="absolute right-0 top-0 h-40 w-40 -translate-y-10 translate-x-10 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-24 w-24 -translate-x-8 translate-y-8 rounded-full bg-oui-gold/20 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="text-xs uppercase tracking-[0.35em] text-white/65">Admin command center</div>
            <h1 className="mt-3 font-serif text-3xl leading-tight sm:text-4xl">Manage access, monitor usage, and keep Odu healthy.</h1>
            <p className="mt-3 max-w-xl text-sm text-white/80">
              Promote the right people, spot engagement changes early, and keep the knowledge base current from one admin surface.
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs text-white/85">
              <HeroPill label="Users" value={stats?.users.total ?? 0} loading={loading} />
              <HeroPill label="Active 30d" value={stats?.users.active_30d ?? 0} loading={loading} />
              <HeroPill label="Questions 30d" value={last30d?.userMessages ?? 0} loading={loading} />
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:w-[360px]">
            <QuickLink href="/admin/users" title="Users" caption="Promote admins and review activity" />
            <QuickLink href="/admin/analytics" title="Analytics" caption="Watch traffic and engagement" />
            <QuickLink href="/admin/knowledge" title="Knowledge" caption="Refresh the handbook content" />
          </div>
        </div>
      </section>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Users"
          value={stats?.users.total ?? 0}
          sublabel={stats ? `${stats.users.admins} admins, +${stats.users.new_30d} in 30 days` : undefined}
          trend={stats ? { value: `${stats.users.adminShare}% admin share` } : undefined}
          loading={loading}
          icon={<IconUsers />}
        />
        <StatCard
          label="Active Members"
          value={stats?.users.active_30d ?? 0}
          sublabel={stats ? `${stats.users.activationRate30d}% of the user base active this month` : undefined}
          trend={stats ? { value: `${stats.users.active_7d} active in the last 7 days`, positive: stats.users.active_7d > 0 } : undefined}
          loading={loading}
          icon={<IconPulse />}
        />
        <StatCard
          label="Questions (30d)"
          value={last30d?.userMessages ?? 0}
          sublabel={stats ? `${stats.messages.msgs_24h} messages in the last 24h` : undefined}
          trend={stats ? { value: `${stats.sessions.avgQuestionsPerSession} avg questions per session`, positive: stats.sessions.avgQuestionsPerSession >= 1 } : undefined}
          loading={loading}
          icon={<IconMessage />}
        />
        <StatCard
          label="Knowledge Chunks"
          value={stats?.knowledgeBase.chunks ?? 0}
          sublabel={stats ? `avg ${stats.knowledgeBase.avgLength} chars, max ${stats.knowledgeBase.maxLength}` : undefined}
          trend={stats ? { value: `${stats.sessions.total} tracked conversations overall` } : undefined}
          loading={loading}
          icon={<IconBook />}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]">
        {stats ? (
          <MessagesChart
            data={stats.dailyActivity}
            title="Engagement"
            subtitle="30-day website activity"
            ariaLabel="Thirty-day messages, questions, and sessions"
            series={ACTIVITY_SERIES}
            areaKey="messages"
          />
        ) : (
          <div className="h-[292px] animate-pulse rounded-2xl border border-oui-border bg-oui-surface dark:border-oui-border-dark dark:bg-oui-surface-dark" />
        )}

        <Panel title="Operations pulse" hint="What needs attention right now">
          {stats ? (
            <div className="space-y-4">
              <MetricRow label="User activation" value={`${stats.users.activationRate30d}%`} detail={`${stats.users.active_30d} of ${stats.users.total} users active in 30 days`} />
              <MetricRow label="Session depth" value={`${stats.sessions.avgQuestionsPerSession}`} detail="Average user questions per conversation" />
              <MetricRow label="Messages today" value={`${stats.messages.msgs_24h}`} detail="Includes user and assistant replies" />
              <MetricRow label="Sessions per user" value={`${stats.sessions.avgSessionsPerUser}`} detail="Average repeat usage across signed-in users" />

              <div className="rounded-2xl border border-oui-border/80 bg-oui-bg/40 p-4 dark:border-oui-border-dark dark:bg-oui-bg-dark/30">
                <div className="text-[11px] uppercase tracking-[0.28em] text-oui-muted">Role distribution</div>
                <div className="mt-3 space-y-3">
                  {stats.roleDistribution.map((item) => (
                    <DistributionRow key={item.role} role={item.role} count={item.count} total={stats.users.total} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <SkeletonBlocks count={4} />
          )}
        </Panel>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Top users" hint="By questions asked">
          {stats ? (
            stats.topUsers.length === 0 ? (
              <EmptyLine>No user activity yet.</EmptyLine>
            ) : (
              <ul className="divide-y divide-oui-border dark:divide-oui-border-dark">
                {stats.topUsers.map((user, index) => (
                  <li key={user.id} className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-oui-navy text-sm font-semibold text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{user.name || user.email}</div>
                      <div className="truncate text-xs text-oui-muted">{user.email}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{user.messageCount}</div>
                      <div className="text-[10px] uppercase tracking-wider text-oui-muted">questions</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">{user.sessionCount}</div>
                      <div className="text-[10px] uppercase tracking-wider text-oui-muted">sessions</div>
                    </div>
                    {user.role === "admin" && <RoleBadge>admin</RoleBadge>}
                  </li>
                ))}
              </ul>
            )
          ) : (
            <SkeletonList />
          )}
        </Panel>

        <Panel
          title="Recent signups"
          hint={<Link className="text-oui-maroon hover:underline dark:text-oui-gold" href="/admin/users">Open user management →</Link>}
        >
          {stats ? (
            stats.recentUsers.length === 0 ? (
              <EmptyLine>No signups yet.</EmptyLine>
            ) : (
              <ul className="divide-y divide-oui-border dark:divide-oui-border-dark">
                {stats.recentUsers.map((user) => (
                  <li key={user.id} className="flex gap-3 py-3">
                    <Avatar name={user.name || user.email} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium">{user.name || user.email}</div>
                        {user.role === "admin" && <RoleBadge>admin</RoleBadge>}
                      </div>
                      <div className="truncate text-xs text-oui-muted">{user.email}</div>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-oui-muted">
                        <span>{user.sessionCount} sessions</span>
                        <span>{user.questionCount} questions</span>
                        <span>{user.lastActiveAt ? `last active ${relative(user.lastActiveAt)}` : "no activity yet"}</span>
                      </div>
                    </div>
                    <div className="whitespace-nowrap text-xs text-oui-muted">{relative(user.createdAt)}</div>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <SkeletonList />
          )}
        </Panel>
      </section>
    </main>
  );
}

function Panel({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-5">
      <div className="flex items-baseline justify-between mb-3">
        <h2 className="font-serif text-lg">{title}</h2>
        {hint && <div className="text-xs text-oui-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const letter = name.trim()[0]?.toUpperCase() ?? "?";
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-oui-navy text-sm font-semibold text-white">
      {letter}
    </div>
  );
}

function RoleBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-oui-gold/20 text-oui-maroon dark:text-oui-gold px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
      {children}
    </span>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <div className="text-sm text-oui-muted py-4">{children}</div>;
}

function SkeletonList() {
  return (
    <div className="space-y-2 py-1">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 rounded bg-oui-border/40 dark:bg-oui-border-dark/40 animate-pulse" />
      ))}
    </div>
  );
}

function SkeletonBlocks({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="h-16 animate-pulse rounded-2xl bg-oui-border/40 dark:bg-oui-border-dark/40" />
      ))}
    </div>
  );
}

function QuickLink({ href, title, caption }: { href: string; title: string; caption: string }) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/15 bg-white/8 px-4 py-3 transition hover:border-white/25 hover:bg-white/12"
    >
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-white/70">{caption}</div>
    </Link>
  );
}

function HeroPill({ label, value, loading }: { label: string; value: string | number; loading: boolean }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5">
      <span className="text-white/60">{label}</span>
      <span className="ml-2 font-semibold text-white">{loading ? "..." : value}</span>
    </div>
  );
}

function MetricRow({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-oui-border/80 bg-oui-bg/40 p-4 dark:border-oui-border-dark dark:bg-oui-bg-dark/30">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <div className="font-serif text-2xl leading-none">{value}</div>
      </div>
      <div className="mt-2 text-xs text-oui-muted">{detail}</div>
    </div>
  );
}

function DistributionRow({ role, count, total }: { role: string; count: number; total: number }) {
  const percent = total === 0 ? 0 : (count / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="uppercase tracking-[0.22em] text-oui-muted">{role}</span>
        <span className="font-medium text-foreground">{count}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-oui-border/70 dark:bg-oui-border-dark/80">
        <div
          className={`h-full rounded-full ${role === "admin" ? "bg-oui-gold" : "bg-oui-maroon"}`}
          style={{ width: `${Math.max(percent, count > 0 ? 8 : 0)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-oui-muted">{percent.toFixed(1)}% of accounts</div>
    </div>
  );
}

function summarise(
  points: Array<{ messages: number; userMessages: number; sessions: number; signups: number }>,
) {
  return points.reduce(
    (total, point) => ({
      messages: total.messages + point.messages,
      userMessages: total.userMessages + point.userMessages,
      sessions: total.sessions + point.sessions,
      signups: total.signups + point.signups,
    }),
    { messages: 0, userMessages: 0, sessions: 0, signups: 0 },
  );
}

function relative(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = Math.max(0, now - then);
  const m = Math.round(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── Inline icons (keeps the page self-contained) ────────────────── */
const iconProps = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const IconUsers = () => (
  <svg {...iconProps}>
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const IconPulse = () => (
  <svg {...iconProps}><path d="M22 12h-4l-3 7-4-14-3 7H2" /></svg>
);
const IconMessage = () => (
  <svg {...iconProps}><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.36 0-2.65-.27-3.79-.75L3 21l1.75-4.5C3.65 15 3 13.55 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
);
const IconBook = () => (
  <svg {...iconProps}><path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15z" /><path d="M4 19.5A2.5 2.5 0 016.5 22H20v-5" /></svg>
);
