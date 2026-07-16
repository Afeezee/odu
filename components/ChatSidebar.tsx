"use client";
import { useEffect, useState, useCallback } from "react";

export interface SessionListItem {
  id: string;
  title: string;
  createdAt: string;
  lastActiveAt: string;
  messageCount: number;
}

interface Bucket {
  label: string;
  items: SessionListItem[];
}

function bucketise(items: SessionListItem[]): Bucket[] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;
  const startOf30Days = startOfToday - 30 * 24 * 60 * 60 * 1000;

  const buckets: Record<string, SessionListItem[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 days": [],
    "Previous 30 days": [],
    Older: [],
  };

  for (const it of items) {
    const t = new Date(it.lastActiveAt).getTime();
    if (t >= startOfToday) buckets.Today.push(it);
    else if (t >= startOfYesterday) buckets.Yesterday.push(it);
    else if (t >= startOf7Days) buckets["Previous 7 days"].push(it);
    else if (t >= startOf30Days) buckets["Previous 30 days"].push(it);
    else buckets.Older.push(it);
  }

  return Object.entries(buckets)
    .filter(([, v]) => v.length > 0)
    .map(([label, items]) => ({ label, items }));
}

export function ChatSidebar({
  currentSessionId,
  refreshKey,
  onSelect,
  onNew,
  isOpen,
  onClose,
}: {
  currentSessionId: string | null;
  refreshKey: number; // bump this to trigger a reload after send
  onSelect: (id: string) => void;
  onNew: () => void;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [items, setItems] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (res.ok) {
        const json = (await res.json()) as { sessions: SessionListItem[] };
        setItems(json.sessions);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const del = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    const prev = items;
    setItems((s) => s.filter((x) => x.id !== id));
    if (currentSessionId === id) onNew();
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
    } catch {
      // rollback on failure
      setItems(prev);
      alert("Delete failed. Please try again.");
    }
  };

  const buckets = bucketise(items);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-20 bg-black/40"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-30 h-dvh w-[280px] border-r border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark transition-transform lg:static lg:h-auto lg:self-stretch lg:translate-x-0 lg:transition-none flex-shrink-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
      >
        <div className="flex items-center gap-2 p-3 border-b border-oui-border dark:border-oui-border-dark">
          <button
            onClick={() => {
              onNew();
              onClose();
            }}
            className="flex-1 inline-flex items-center gap-2 rounded-full bg-oui-maroon text-white px-4 py-2 text-sm font-medium hover:bg-oui-maroon-600 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-oui-gold/10"
            aria-label="Close sidebar"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loading && items.length === 0 ? (
            <div className="text-xs text-oui-muted p-3">Loading…</div>
          ) : items.length === 0 ? (
            <div className="text-xs text-oui-muted p-3 leading-relaxed">
              No conversations yet. Ask Odu anything to start one.
            </div>
          ) : (
            buckets.map((b) => (
              <div key={b.label} className="mb-3">
                <div className="px-2 py-1 text-[10px] uppercase tracking-widest text-oui-muted">
                  {b.label}
                </div>
                <ul className="space-y-0.5">
                  {b.items.map((s) => {
                    const active = currentSessionId === s.id;
                    return (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            onSelect(s.id);
                            onClose();
                          }}
                          className={`group w-full text-left px-2 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                            active
                              ? "bg-oui-gold/20 text-oui-maroon dark:text-oui-gold font-medium"
                              : "hover:bg-oui-gold/10"
                          }`}
                        >
                          <span className="truncate flex-1">{s.title}</span>
                          <span
                            onClick={(e) => del(s.id, e)}
                            role="button"
                            tabIndex={0}
                            aria-label="Delete conversation"
                            className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 rounded hover:bg-red-500/10 hover:text-red-600 transition-opacity"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                            </svg>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </aside>
    </>
  );
}
