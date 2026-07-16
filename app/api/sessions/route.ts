import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rawSql } from "@/lib/db/client";

export const runtime = "nodejs";

/**
 * List the signed-in user's chat sessions, newest first.
 * Title is derived from the first user message (truncated) so we don't need
 * to store it separately. Only sessions that already have at least one
 * message are returned — empty in-flight sessions would just be noise.
 */
export async function GET() {
  const auth = await getSession();
  if (!auth) {
    return NextResponse.json({ error: "sign-in required" }, { status: 401 });
  }

  const rows = (await rawSql(
    `SELECT
       s.id,
       s.last_active_at,
       s.created_at,
       (SELECT content FROM chat_messages
         WHERE session_id = s.id AND role = 'user'
         ORDER BY created_at ASC LIMIT 1) AS first_message,
       (SELECT COUNT(*)::int FROM chat_messages WHERE session_id = s.id) AS message_count
     FROM chat_sessions s
     WHERE s.user_id = $1
     ORDER BY s.last_active_at DESC
     LIMIT 200`,
    [auth.userId],
  )) as Array<{
    id: string;
    last_active_at: string;
    created_at: string;
    first_message: string | null;
    message_count: number;
  }>;

  const sessions = rows
    .filter((r) => (r.message_count ?? 0) > 0)
    .map((r) => ({
      id: r.id,
      title: makeTitle(r.first_message),
      createdAt: r.created_at,
      lastActiveAt: r.last_active_at,
      messageCount: r.message_count,
    }));

  return NextResponse.json({ sessions });
}

function makeTitle(firstMessage: string | null): string {
  if (!firstMessage) return "New conversation";
  const collapsed = firstMessage.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 60) return collapsed;
  return collapsed.slice(0, 57).trimEnd() + "…";
}
