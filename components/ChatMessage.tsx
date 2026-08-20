"use client";
import type { ReactNode } from "react";
import { OuiLogo } from "./OuiLogo";

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant reply is still in flight — show the thinking indicator. */
  pending?: boolean;
}

// Minimal markdown-ish renderer: bold, italic, inline code, and lists.
// Deliberately lightweight so we don't drag in a full markdown lib.
function renderInline(text: string) {
  const nodes: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const push = (s: string) => nodes.push(s);
  while (i < text.length) {
    const rest = text.slice(i);
    let m: RegExpMatchArray | null;
    if ((m = rest.match(/^\*\*(.+?)\*\*/))) {
      nodes.push(<strong key={key++}>{m[1]}</strong>);
      i += m[0].length;
    } else if ((m = rest.match(/^_(.+?)_/)) || (m = rest.match(/^\*(.+?)\*/))) {
      nodes.push(<em key={key++}>{m[1]}</em>);
      i += m[0].length;
    } else if ((m = rest.match(/^`([^`]+)`/))) {
      nodes.push(<code key={key++}>{m[1]}</code>);
      i += m[0].length;
    } else {
      const next = rest.search(/(\*\*|_[^_]+_|\*[^*]+\*|`[^`]+`)/);
      if (next === -1) {
        push(rest);
        i += rest.length;
      } else {
        push(rest.slice(0, next));
        i += next;
      }
    }
  }
  return nodes;
}

function renderBlocks(content: string) {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length === 0) return;
    blocks.push(
      <ul key={key++}>
        {listBuf.map((l, i) => (
          <li key={i}>{renderInline(l.replace(/^[-*]\s+/, ""))}</li>
        ))}
      </ul>,
    );
    listBuf = [];
  };

  let paraBuf: string[] = [];
  const flushPara = () => {
    if (paraBuf.length === 0) return;
    blocks.push(<p key={key++}>{renderInline(paraBuf.join(" "))}</p>);
    paraBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushList();
      flushPara();
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      flushPara();
      listBuf.push(line);
    } else {
      flushList();
      paraBuf.push(line);
    }
  }
  flushList();
  flushPara();
  return blocks;
}

function ThinkingDots() {
  return (
    <span className="inline-flex items-center gap-2 text-oui-muted">
      <span className="inline-flex gap-1" aria-hidden>
        <span className="thinking-dot" style={{ animationDelay: "0ms" }} />
        <span className="thinking-dot" style={{ animationDelay: "160ms" }} />
        <span className="thinking-dot" style={{ animationDelay: "320ms" }} />
      </span>
      <span className="text-sm">Odu is thinking…</span>
    </span>
  );
}

export function ChatMessage({ msg }: { msg: ChatMessageData }) {
  const isUser = msg.role === "user";
  const showThinking = !isUser && msg.pending && !msg.content;
  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="flex-shrink-0 mt-0.5">
          <OuiLogo className="h-7 w-7" />
        </div>
      )}
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
          isUser
            ? "bg-oui-maroon text-white rounded-br-md"
            : "bg-oui-surface dark:bg-oui-surface-dark border border-oui-border dark:border-oui-border-dark rounded-bl-md"
        }`}
      >
        {showThinking ? (
          <ThinkingDots />
        ) : (
          <div className="chat-prose">{renderBlocks(msg.content)}</div>
        )}
      </div>
    </div>
  );
}
