"use client";
import { useEffect, useState } from "react";

interface IngestResult {
  ok: true;
  mode: "truncate" | "upsert";
  chunks: number;
  averageLength: number;
  warnings: { headingPath: string; reason: string; length: number }[];
}

interface KbSummary {
  chunks: number;
  avgLength: number;
  maxLength: number;
}

export default function AdminKnowledgePage() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"truncate" | "upsert">("truncate");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<IngestResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kb, setKb] = useState<KbSummary | null>(null);

  const loadKb = async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) return;
      const json = await res.json();
      setKb(json.knowledgeBase);
    } catch {}
  };

  useEffect(() => {
    loadKb();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("mode", mode);
      const res = await fetch("/api/admin/ingest", { method: "POST", body: form });
      if (res.status === 401 || res.status === 403) {
        window.location.href = `/sign-in?next=${encodeURIComponent("/admin/knowledge")}`;
        return;
      }
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setResult(json as IngestResult);
      loadKb();
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-3xl w-full px-4 py-8">
      <div className="mb-6">
        <h1 className="font-serif text-3xl">Knowledge Base</h1>
        <p className="text-sm text-oui-muted">
          Ingest a cleaned <code className="text-xs">.md</code> handbook file. Existing chunks are replaced (truncate) or updated per heading (upsert).
        </p>
      </div>

      {kb && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <SmallStat label="Chunks in KB" value={kb.chunks} />
          <SmallStat label="Avg chunk length" value={`${kb.avgLength} chars`} />
          <SmallStat label="Largest chunk" value={`${kb.maxLength} chars`} />
        </div>
      )}

      <form
        onSubmit={submit}
        className="rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-6 space-y-5"
      >
        <label className="block">
          <span className="text-sm font-medium">Handbook markdown file</span>
          <input
            type="file"
            accept=".md,text/markdown,text/plain"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
            className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-oui-maroon file:text-white file:px-3 file:py-1.5 file:cursor-pointer"
          />
        </label>

        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium">Mode</legend>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" checked={mode === "truncate"} onChange={() => setMode("truncate")} className="mt-1" />
            <span>
              <strong>Truncate + insert</strong> — wipe all chunks first. Cleanest; use when the handbook has changed structure.
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="radio" checked={mode === "upsert"} onChange={() => setMode("upsert")} className="mt-1" />
            <span>
              <strong>Upsert by heading</strong> — replace only chunks whose heading_path appears in the new file. Preserves manually-added rows.
            </span>
          </label>
        </fieldset>

        <button
          type="submit"
          disabled={busy || !file}
          className="inline-flex items-center gap-2 rounded-full bg-oui-maroon text-white px-6 py-2.5 font-medium hover:bg-oui-maroon-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {busy ? "Ingesting…" : "Ingest"}
        </button>
      </form>

      {error && (
        <div className="mt-6 rounded-md border border-red-300 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-6 rounded-md border border-oui-gold/60 bg-oui-gold/10 px-4 py-3 text-sm">
          <div className="font-semibold text-oui-maroon dark:text-oui-gold mb-1">Ingestion complete</div>
          <div>Mode: <strong>{result.mode}</strong></div>
          <div>Chunks: <strong>{result.chunks}</strong></div>
          <div>Avg length: <strong>{result.averageLength}</strong> chars</div>
          <div>Warnings: <strong>{result.warnings.length}</strong></div>
          {result.warnings.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs">
              {result.warnings.map((w, i) => (
                <li key={i}>
                  [{w.length}] {w.headingPath} — {w.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </main>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark p-3">
      <div className="text-[10px] uppercase tracking-widest text-oui-muted">{label}</div>
      <div className="mt-1 font-serif text-xl">{value}</div>
    </div>
  );
}
