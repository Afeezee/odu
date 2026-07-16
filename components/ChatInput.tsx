"use client";
import { useRef, useState, KeyboardEvent } from "react";

export function ChatInput({
  onSend,
  disabled,
}: {
  onSend: (msg: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  const ta = useRef<HTMLTextAreaElement>(null);

  const send = () => {
    const v = value.trim();
    if (!v || disabled) return;
    onSend(v);
    setValue("");
    if (ta.current) ta.current.style.height = "auto";
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="border-t border-oui-border dark:border-oui-border-dark bg-oui-bg/85 dark:bg-oui-bg-dark/85 backdrop-blur">
      <div className="mx-auto max-w-3xl px-4 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-oui-border dark:border-oui-border-dark bg-oui-surface dark:bg-oui-surface-dark shadow-sm focus-within:border-oui-gold transition-colors px-3 py-2">
          <textarea
            ref={ta}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 200) + "px";
            }}
            onKeyDown={onKey}
            rows={1}
            placeholder="Ask about programmes, fees, admissions, staff…"
            disabled={disabled}
            className="flex-1 resize-none bg-transparent outline-none text-[15px] leading-relaxed placeholder:text-oui-muted"
          />
          <button
            onClick={send}
            disabled={disabled || !value.trim()}
            className="flex-shrink-0 h-9 w-9 rounded-full bg-oui-maroon text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-oui-maroon-600 transition-colors flex items-center justify-center"
            aria-label="Send"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="mt-1.5 text-[11px] text-oui-muted text-center">
          Odu can make mistakes. Verify important details with the relevant OUI office.
        </div>
      </div>
    </div>
  );
}
