import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { embedText } from "@/lib/embeddings";
import { retrieveTopK } from "@/lib/retrieval";
import { buildSystemPrompt, completeGroqChat, type ChatTurn } from "@/lib/groq";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

interface ChatRequest {
  message: string;
  sessionId?: string;
}

export async function POST(req: NextRequest) {
  const auth = await getSession();
  if (!auth) {
    return NextResponse.json({ error: "sign-in required" }, { status: 401 });
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Session bootstrap. If the supplied sessionId belongs to a different user
  // (or doesn't exist), mint a fresh one — we never leak conversation across
  // accounts.
  let sessionId = body.sessionId;
  if (sessionId) {
    const existing = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
    if (existing.length === 0 || (existing[0].userId && existing[0].userId !== auth.userId)) {
      sessionId = undefined;
    }
  }
  if (!sessionId) {
    sessionId = randomUUID();
    await db.insert(chatSessions).values({ id: sessionId, userId: auth.userId });
  } else {
    await db
      .update(chatSessions)
      .set({ lastActiveAt: new Date(), userId: auth.userId })
      .where(eq(chatSessions.id, sessionId));
  }

  // Retrieve context
  const queryEmbedding = await embedText(message);
  const retrieved = await retrieveTopK(queryEmbedding, 5);
  const retrievedIds = retrieved.map((r) => r.id);

  // Last 4 turns (8 messages) for follow-up support
  const historyRows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(8);
  const history: ChatTurn[] = historyRows
    .reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  // Persist the user message first so it's durable even if the completion
  // call fails partway through.
  await db.insert(chatMessages).values({
    sessionId,
    role: "user",
    content: message,
    retrievedChunkIds: retrievedIds,
  });

  const systemPrompt = buildSystemPrompt(retrieved);
  let answer: string;
  try {
    answer = (await completeGroqChat({ systemPrompt, history, userMessage: message })).trim();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "unknown error from model";
    return NextResponse.json(
      { error: `The assistant is unavailable right now (${errMsg}). Please try again.`, sessionId },
      { status: 502 },
    );
  }
  if (!answer) {
    answer = "I couldn't produce an answer this time — please try rephrasing your question.";
  }

  await db.insert(chatMessages).values({
    sessionId,
    role: "assistant",
    content: answer,
    retrievedChunkIds: retrievedIds,
  });

  return NextResponse.json({
    ok: true,
    sessionId,
    message: {
      id: `assistant-${Date.now()}`,
      role: "assistant" as const,
      content: answer,
    },
  });
}
