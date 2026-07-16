import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { chatMessages, chatSessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { embedText } from "@/lib/embeddings";
import { retrieveTopK } from "@/lib/retrieval";
import { buildSystemPrompt, streamGroqChat, type ChatTurn } from "@/lib/groq";
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
    return new Response(JSON.stringify({ error: "sign-in required" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  let body: ChatRequest;
  try {
    body = (await req.json()) as ChatRequest;
  } catch {
    return new Response(JSON.stringify({ error: "invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }
  const message = body.message?.trim();
  if (!message) {
    return new Response(JSON.stringify({ error: "message is required" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
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

  // Persist the user message before streaming so it's durable even if the
  // client disconnects mid-response.
  await db.insert(chatMessages).values({
    sessionId,
    role: "user",
    content: message,
    retrievedChunkIds: retrievedIds,
  });

  const systemPrompt = buildSystemPrompt(retrieved);
  const groqStream = await streamGroqChat({ systemPrompt, history, userMessage: message });

  // We emit an SSE-like stream:
  //   event: sources  data: [{...}]
  //   event: token    data: {"t": "…"}
  //   event: done     data: {"sessionId": "…"}
  // The frontend consumes this via a small custom reader.
  const encoder = new TextEncoder();
  let assistantAcc = "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        // Retrieved chunk IDs are stored in chat_messages for debugging /
        // transparency, but never surfaced to the client — the user should
        // never see reference markers or a sources panel.
        for await (const chunk of groqStream) {
          const token = chunk.choices?.[0]?.delta?.content ?? "";
          if (token) {
            assistantAcc += token;
            send("token", { t: token });
          }
        }
        send("done", { sessionId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown error";
        send("error", { error: msg });
      } finally {
        // Persist the completed assistant message (or whatever we managed
        // to stream) so history is preserved across follow-ups.
        try {
          if (assistantAcc.trim().length > 0) {
            await db.insert(chatMessages).values({
              sessionId,
              role: "assistant",
              content: assistantAcc,
              retrievedChunkIds: retrievedIds,
            });
          }
        } catch (e) {
          console.error("Failed to persist assistant message:", e);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-session-id": sessionId,
    },
  });
}
