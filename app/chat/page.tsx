"use client";
import { useEffect, useRef, useState } from "react";
import { ChatMessage, type ChatMessageData } from "@/components/ChatMessage";
import { ChatInput } from "@/components/ChatInput";
import { ChatSidebar } from "@/components/ChatSidebar";

const STORAGE_KEY = "odu-session-id";

const SUGGESTIONS = [
  "What are the graduation requirements for a UTME-admitted student?",
  "List the departments in the College of Engineering.",
  "How much are the school fees for returning students this semester?",
  "What is the policy on examination malpractice?",
];

interface StoredMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ChatResponse {
  ok: true;
  sessionId: string;
  message: { id: string; role: "assistant"; content: string };
}
interface ChatError {
  error: string;
  sessionId?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [historyKey, setHistoryKey] = useState(0);
  const [loadingSession, setLoadingSession] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Restore last session on first paint.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSessionId(stored);
        void loadSession(stored, true);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const persistSessionId = (id: string | null) => {
    setSessionId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const loadSession = async (id: string, silent = false) => {
    if (!silent) setLoadingSession(true);
    try {
      const res = await fetch(`/api/sessions/${id}`);
      if (res.status === 404) {
        persistSessionId(null);
        setMessages([]);
        return;
      }
      if (!res.ok) return;
      const json = (await res.json()) as { messages: StoredMessage[] };
      setMessages(
        json.messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        })),
      );
      persistSessionId(id);
    } finally {
      if (!silent) setLoadingSession(false);
    }
  };

  const newChat = () => {
    setMessages([]);
    persistSessionId(null);
  };

  const selectSession = (id: string) => {
    if (id === sessionId) return;
    void loadSession(id);
  };

  const send = async (text: string) => {
    if (busy) return;
    setBusy(true);

    const userMsg: ChatMessageData = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };
    const pendingId = crypto.randomUUID();
    const pendingMsg: ChatMessageData = {
      id: pendingId,
      role: "assistant",
      content: "",
      pending: true,
    };
    setMessages((m) => [...m, userMsg, pendingMsg]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId ?? undefined }),
      });
      if (res.status === 401) {
        window.location.href = `/sign-in?next=${encodeURIComponent("/chat")}`;
        return;
      }
      const payload = (await res.json()) as ChatResponse | ChatError;

      if (!res.ok || !("ok" in payload)) {
        const err = (payload as ChatError).error ?? `HTTP ${res.status}`;
        setMessages((all) =>
          all.map((m) =>
            m.id === pendingId
              ? { ...m, pending: false, content: `Sorry — ${err}` }
              : m,
          ),
        );
        return;
      }

      if (payload.sessionId && payload.sessionId !== sessionId) {
        persistSessionId(payload.sessionId);
      }

      setMessages((all) =>
        all.map((m) =>
          m.id === pendingId
            ? { ...m, pending: false, content: payload.message.content }
            : m,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      setMessages((all) =>
        all.map((m) =>
          m.id === pendingId ? { ...m, pending: false, content: `Sorry — ${message}` } : m,
        ),
      );
    } finally {
      setBusy(false);
      // Refresh sidebar so the new/updated conversation appears at the top.
      setHistoryKey((k) => k + 1);
    }
  };

  return (
    <main className="flex-1 flex min-h-0">
      <ChatSidebar
        currentSessionId={sessionId}
        refreshKey={historyKey}
        onSelect={selectSession}
        onNew={newChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden flex items-center gap-2 border-b border-oui-border dark:border-oui-border-dark px-3 py-2">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-md hover:bg-oui-gold/10"
            aria-label="Open conversation history"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>
          <span className="text-sm text-oui-muted">Conversations</span>
        </div>

        <div ref={scrollerRef} className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {loadingSession ? (
              <div className="py-10 text-center text-sm text-oui-muted">Loading conversation…</div>
            ) : messages.length === 0 ? (
              <EmptyState onPick={send} />
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <ChatMessage key={m.id} msg={m} />
                ))}
              </div>
            )}
          </div>
        </div>

        <ChatInput onSend={send} disabled={busy || loadingSession} />
      </div>
    </main>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="py-10 text-center">
      <h2 className="font-serif text-2xl sm:text-3xl">
        How can I help you with{" "}
        <span className="text-oui-maroon dark:text-oui-gold">Oduduwa University</span> today?
      </h2>
      <p className="mt-2 text-oui-muted text-sm max-w-md mx-auto">
        Ask about programmes, admissions, fees, staff, or any policy in the OUI Handbook.
      </p>
      <div className="mt-8 grid gap-2 sm:grid-cols-2 max-w-2xl mx-auto text-left">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="rounded-xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-3 text-sm hover:border-oui-gold hover:bg-oui-gold/5 transition-colors text-left"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
