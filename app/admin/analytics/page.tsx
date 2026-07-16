"use client";

import Link from "next/link";
import { MessagesChart } from "@/components/MessagesChart";
import { StatCard } from "@/components/StatCard";
import { useAdminStats } from "../useAdminStats";

const ACTIVITY_SERIES = [
  { key: "messages", label: "messages", color: "#7A1F2E" },
  { key: "userMessages", label: "questions", color: "#D4A017" },
  { key: "sessions", label: "sessions", color: "#102B5C" },
];

const ACQUISITION_SERIES = [
  { key: "signups", label: "signups", color: "#D4A017" },
  { key: "sessions", label: "sessions", color: "#7A1F2E" },
];

export default function AdminAnalyticsPage() {
  const { stats, error, loading } = useAdminStats("/admin/analytics");
  const last7d = stats ? summarise(stats.dailyActivity.slice(-7)) : null;
  const previous7d = stats ? summarise(stats.dailyActivity.slice(-14, -7)) : null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col px-4 py-8">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.32em] text-oui-muted">Analytics</div>
          <h1 className="mt-2 font-serif text-3xl">Website usage and engagement</h1>
          <p className="mt-2 max-w-2xl text-sm text-oui-muted">
            Follow traffic, signups, and question volume without leaving the admin area.
          </p>
        </div>
        <Link
          href="/admin/users"
          className="inline-flex items-center justify-center rounded-full border border-oui-border bg-oui-surface px-4 py-2 text-sm font-medium transition hover:border-oui-gold dark:border-oui-border-dark dark:bg-oui-surface-dark"
        >
          Review user roles
        </Link>
      </section>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Messages (7d)"
          value={last7d?.messages ?? 0}
          sublabel={stats ? `${stats.messages.msgs_24h} messages in the last 24h` : undefined}
          trend={last7d && previous7d ? compareWindows(last7d.messages, previous7d.messages, "vs previous 7 days") : undefined}
          loading={loading}
        />
        <StatCard
          label="Questions (7d)"
          value={last7d?.userMessages ?? 0}
          sublabel={stats ? `${stats.messages.avgQuestionsPerUser} avg questions per active user` : undefined}
          trend={last7d && previous7d ? compareWindows(last7d.userMessages, previous7d.userMessages, "vs previous 7 days") : undefined}
          loading={loading}
        />
        <StatCard
          label="New Users (30d)"
          value={stats?.users.new_30d ?? 0}
          sublabel={stats ? `${stats.users.new_7d} in the last 7 days` : undefined}
          trend={stats ? { value: `${stats.users.activationRate30d}% activated in 30 days`, positive: stats.users.activationRate30d >= 50 } : undefined}
          loading={loading}
        />
        <StatCard
          label="Response Ratio"
          value={stats ? `${stats.messages.responseRate}x` : 0}
          sublabel="Assistant replies per user question"
          trend={stats ? { value: `${stats.sessions.avgSessionsPerUser} sessions per user` } : undefined}
          loading={loading}
        />
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-2">
        {stats ? (
          <MessagesChart
            data={stats.dailyActivity}
            title="Traffic"
            subtitle="Messages, questions, and sessions over 30 days"
            ariaLabel="Thirty-day traffic chart"
            series={ACTIVITY_SERIES}
            areaKey="messages"
          />
        ) : (
          <div className="h-[292px] animate-pulse rounded-2xl border border-oui-border bg-oui-surface dark:border-oui-border-dark dark:bg-oui-surface-dark" />
        )}

        {stats ? (
          <MessagesChart
            data={stats.dailyActivity}
            title="Acquisition"
            subtitle="Signups versus returning conversation volume"
            ariaLabel="Thirty-day acquisition chart"
            series={ACQUISITION_SERIES}
            areaKey="sessions"
          />
        ) : (
          <div className="h-[292px] animate-pulse rounded-2xl border border-oui-border bg-oui-surface dark:border-oui-border-dark dark:bg-oui-surface-dark" />
        )}
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Role distribution" hint="Access footprint">
          {stats ? (
            <div className="space-y-4">
              {stats.roleDistribution.map((item) => (
                <RoleBar key={item.role} role={item.role} count={item.count} total={stats.users.total} />
              ))}
            </div>
          ) : (
            <SkeletonRows />
          )}
        </Panel>

        <Panel title="Performance summary" hint="Last 30 days">
          {stats ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <SummaryTile label="Active users" value={`${stats.users.active_30d}`} note={`${stats.users.activationRate30d}% of signed-up users`} />
              <SummaryTile label="Assistant replies" value={`${stats.messages.assistant_msgs}`} note="Across the full chat history" />
              <SummaryTile label="Avg questions / session" value={`${stats.sessions.avgQuestionsPerSession}`} note="Conversation depth" />
              <SummaryTile label="Messages / 30d" value={`${stats.messages.msgs_30d}`} note="Recent traffic window" />
            </div>
          ) : (
            <SkeletonRows />
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
    <div className="rounded-2xl border border-oui-border bg-oui-surface p-5 dark:border-oui-border-dark dark:bg-oui-surface-dark">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-lg">{title}</h2>
        {hint && <div className="text-xs text-oui-muted">{hint}</div>}
      </div>
      {children}
    </div>
  );
}

function SummaryTile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-2xl border border-oui-border/70 bg-oui-bg/40 p-4 dark:border-oui-border-dark dark:bg-oui-bg-dark/30">
      <div className="text-[11px] uppercase tracking-[0.24em] text-oui-muted">{label}</div>
      <div className="mt-2 font-serif text-3xl leading-none">{value}</div>
      <div className="mt-2 text-xs text-oui-muted">{note}</div>
    </div>
  );
}

function RoleBar({ role, count, total }: { role: string; count: number; total: number }) {
  const percent = total === 0 ? 0 : (count / total) * 100;
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium capitalize">{role}</span>
        <span>{count}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-oui-border/70 dark:bg-oui-border-dark/80">
        <div
          className={`h-full rounded-full ${role === "admin" ? "bg-oui-gold" : "bg-oui-maroon"}`}
          style={{ width: `${Math.max(percent, count > 0 ? 8 : 0)}%` }}
        />
      </div>
      <div className="mt-1 text-[11px] text-oui-muted">{percent.toFixed(1)}%</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-16 animate-pulse rounded-2xl bg-oui-border/40 dark:bg-oui-border-dark/40" />
      ))}
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

function compareWindows(current: number, previous: number, suffix: string) {
  const change = current - previous;
  const direction = change >= 0 ? "+" : "";
  return {
    value: `${direction}${change} ${suffix}`,
    positive: change >= 0,
  };
}