import type { ReactNode } from "react";

export function StatCard({
  label,
  value,
  sublabel,
  icon,
  trend,
  loading,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  icon?: ReactNode;
  trend?: { value: string; positive?: boolean };
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-widest text-oui-muted">{label}</div>
          <div className="mt-1.5 font-serif text-3xl leading-none tracking-tight">
            {loading ? (
              <span className="inline-block h-8 w-16 rounded bg-oui-border dark:bg-oui-border-dark animate-pulse" />
            ) : (
              value
            )}
          </div>
          {sublabel && (
            <div className="mt-1.5 text-xs text-oui-muted">{sublabel}</div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 h-9 w-9 rounded-full bg-oui-gold/10 text-oui-maroon dark:text-oui-gold flex items-center justify-center">
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div
          className={`mt-3 text-xs inline-flex items-center gap-1 ${
            trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-oui-muted"
          }`}
        >
          {trend.positive ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 15l7-7 7 7" />
            </svg>
          ) : null}
          {trend.value}
        </div>
      )}
    </div>
  );
}
