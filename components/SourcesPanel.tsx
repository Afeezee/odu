"use client";
import { useState } from "react";

export interface Source {
  id: number;
  headingPath: string;
  sourceSection: string;
  similarity: number;
}

export function SourcesPanel({ sources }: { sources: Source[] }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-2 text-xs">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-oui-navy dark:text-oui-gold/90 hover:underline"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={open ? "M6 15l6-6 6 6" : "M9 6l6 6-6 6"} />
        </svg>
        Sources ({sources.length})
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1 border-l-2 border-oui-gold/60 pl-3">
          {sources.map((s) => (
            <li key={s.id} className="leading-snug">
              <span className="text-oui-muted">[{Math.round(s.similarity * 100)}%]</span>{" "}
              <span>{s.headingPath}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
