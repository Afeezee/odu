import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { rawSql } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const gate = await requireAdmin();
    if ("response" in gate) return gate.response;

    const rows = (await rawSql(
      `SELECT
         u.id, u.email, u.name, u.role, u.created_at,
         COUNT(DISTINCT s.id)::int AS session_count,
         COUNT(m.id) FILTER (WHERE m.role = 'user')::int AS question_count,
         MAX(m.created_at) AS last_active_at
       FROM users u
       LEFT JOIN chat_sessions s ON s.user_id = u.id
       LEFT JOIN chat_messages m ON m.session_id = s.id
       GROUP BY u.id
       ORDER BY u.created_at DESC`,
    )) as Array<{
      id: string;
      email: string;
      name: string | null;
      role: "user" | "admin";
      created_at: string;
      session_count: number;
      question_count: number;
      last_active_at: string | null;
    }>;

    return NextResponse.json({
      users: rows.map((r) => ({
        id: r.id,
        email: r.email,
        name: r.name,
        role: r.role,
        createdAt: r.created_at,
        sessionCount: r.session_count,
        questionCount: r.question_count,
        lastActiveAt: r.last_active_at,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "failed to load admin users" },
      { status: 500 },
    );
  }
}
