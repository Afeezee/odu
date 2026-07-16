import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db/client";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { and, asc, eq } from "drizzle-orm";

export const runtime = "nodejs";

async function loadOwnedSession(sessionId: string, userId: string) {
  const [s] = await db
    .select()
    .from(chatSessions)
    .where(and(eq(chatSessions.id, sessionId), eq(chatSessions.userId, userId)))
    .limit(1);
  return s ?? null;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth) return NextResponse.json({ error: "sign-in required" }, { status: 401 });
  const { id } = await ctx.params;

  const s = await loadOwnedSession(id, auth.userId);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({
    session: { id: s.id, createdAt: s.createdAt, lastActiveAt: s.lastActiveAt },
    messages: rows.map((m) => ({
      id: String(m.id),
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt,
    })),
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const auth = await getSession();
  if (!auth) return NextResponse.json({ error: "sign-in required" }, { status: 401 });
  const { id } = await ctx.params;

  const s = await loadOwnedSession(id, auth.userId);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });

  // FK on chat_messages.session_id is ON DELETE CASCADE, so this drops
  // the messages too.
  await db.delete(chatSessions).where(eq(chatSessions.id, id));
  return NextResponse.json({ ok: true });
}
