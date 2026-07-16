import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { rawSql } from "@/lib/db/client";

export const runtime = "nodejs";

type Row<T> = Array<T>;

function query<T>(statement: string, params?: unknown[]) {
  return rawSql(statement, params) as unknown as Promise<Row<T>>;
}

export async function GET() {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;

  // Run counts in parallel — neon-http is HTTP-based so each call is a
  // round-trip; batching independent reads keeps p50 low.
  const [
    userCounts,
    sessionCounts,
    messageCounts,
    chunkStats,
    dailyActivityRows,
    roleDistributionRows,
    topUsersRows,
    recentUsers,
  ] = await Promise.all([
    query<{
      total: number;
      admins: number;
      new_24h: number;
      new_7d: number;
      new_30d: number;
      active_7d: number;
      active_30d: number;
    }>(
      `SELECT
         COUNT(DISTINCT u.id)::int AS total,
         COUNT(DISTINCT u.id) FILTER (WHERE u.role = 'admin')::int AS admins,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '24 hours')::int AS new_24h,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '7 days')::int AS new_7d,
         COUNT(DISTINCT u.id) FILTER (WHERE u.created_at >= NOW() - INTERVAL '30 days')::int AS new_30d,
         COUNT(DISTINCT u.id) FILTER (WHERE s.last_active_at >= NOW() - INTERVAL '7 days')::int AS active_7d,
         COUNT(DISTINCT u.id) FILTER (WHERE s.last_active_at >= NOW() - INTERVAL '30 days')::int AS active_30d
       FROM users u
       LEFT JOIN chat_sessions s ON s.user_id = u.id`,
    ),
    query<{
      total: number;
      active_24h: number;
      active_7d: number;
      active_30d: number;
      avg_questions_per_session: number;
      avg_sessions_per_user: number;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '24 hours')::int AS active_24h,
         COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '7 days')::int AS active_7d,
         COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days')::int AS active_30d,
         COALESCE(ROUND(AVG(COALESCE(session_questions.question_count, 0)), 1), 0)::float AS avg_questions_per_session,
         COALESCE(ROUND(COUNT(*)::numeric / NULLIF(COUNT(DISTINCT user_id), 0), 1), 0)::float AS avg_sessions_per_user
       FROM chat_sessions
       LEFT JOIN (
         SELECT
           session_id,
           COUNT(*) FILTER (WHERE role = 'user')::int AS question_count
         FROM chat_messages
         GROUP BY session_id
       ) session_questions ON session_questions.session_id = chat_sessions.id
       WHERE user_id IS NOT NULL`,
    ),
    query<{
      total: number;
      user_msgs: number;
      assistant_msgs: number;
      msgs_24h: number;
      msgs_7d: number;
      msgs_30d: number;
      avg_questions_per_user: number;
      response_rate: number;
    }>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE role = 'user')::int AS user_msgs,
         COUNT(*) FILTER (WHERE role = 'assistant')::int AS assistant_msgs,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::int AS msgs_24h,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days')::int AS msgs_7d,
         COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS msgs_30d,
         COALESCE(
           ROUND(
             COUNT(*) FILTER (WHERE chat_messages.role = 'user')::numeric /
             NULLIF(COUNT(DISTINCT chat_sessions.user_id) FILTER (WHERE chat_sessions.user_id IS NOT NULL), 0),
             1
           ),
           0
         )::float AS avg_questions_per_user,
         COALESCE(
           ROUND(
             COUNT(*) FILTER (WHERE chat_messages.role = 'assistant')::numeric /
             NULLIF(COUNT(*) FILTER (WHERE chat_messages.role = 'user'), 0),
             2
           ),
           0
         )::float AS response_rate
       FROM chat_messages
       LEFT JOIN chat_sessions ON chat_sessions.id = chat_messages.session_id`,
    ),
    query<{ chunks: number; avg_length: number; max_length: number }>(
      `SELECT
         COUNT(*)::int AS chunks,
         COALESCE(ROUND(AVG(LENGTH(content))), 0)::int AS avg_length,
         COALESCE(MAX(LENGTH(content)), 0)::int AS max_length
       FROM document_chunks`,
    ),
    query<{
      day: string;
      messages: number;
      user_msgs: number;
      sessions: number;
      signups: number;
    }>(
      `WITH days AS (
         SELECT generate_series(
           date_trunc('day', NOW()) - INTERVAL '29 days',
           date_trunc('day', NOW()),
           INTERVAL '1 day'
         ) AS d
       )
       SELECT
         to_char(d.d, 'YYYY-MM-DD') AS day,
         COALESCE(m.total, 0)::int AS messages,
         COALESCE(m.user_msgs, 0)::int AS user_msgs,
         COALESCE(s.total, 0)::int AS sessions,
         COALESCE(u.total, 0)::int AS signups
       FROM days d
       LEFT JOIN (
         SELECT
           date_trunc('day', created_at) AS d,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE role = 'user') AS user_msgs
         FROM chat_messages
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
       ) m ON m.d = d.d
       LEFT JOIN (
         SELECT
           date_trunc('day', last_active_at) AS d,
           COUNT(*) AS total
         FROM chat_sessions
         WHERE user_id IS NOT NULL
           AND last_active_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
       ) s ON s.d = d.d
       LEFT JOIN (
         SELECT
           date_trunc('day', created_at) AS d,
           COUNT(*) AS total
         FROM users
         WHERE created_at >= NOW() - INTERVAL '30 days'
         GROUP BY 1
       ) u ON u.d = d.d
       ORDER BY d.d ASC`,
    ),
    query<{ role: string; count: number }>(
      `SELECT role, COUNT(*)::int AS count
       FROM users
       GROUP BY role
       ORDER BY count DESC, role ASC`,
    ),
    query<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      message_count: number;
      session_count: number;
      last_message_at: string | null;
    }>(
      `SELECT
         u.id, u.email, u.name, u.role,
         COUNT(m.id)::int AS message_count,
         COUNT(DISTINCT s.id)::int AS session_count,
         MAX(m.created_at) AS last_message_at
       FROM users u
       LEFT JOIN chat_sessions s ON s.user_id = u.id
       LEFT JOIN chat_messages m ON m.session_id = s.id AND m.role = 'user'
       GROUP BY u.id
       ORDER BY message_count DESC NULLS LAST, u.created_at ASC
       LIMIT 6`,
    ),
    query<{
      id: string;
      email: string;
      name: string | null;
      role: string;
      created_at: string;
      session_count: number;
      question_count: number;
      last_active_at: string | null;
    }>(
      `SELECT
         u.id,
         u.email,
         u.name,
         u.role,
         u.created_at,
         COUNT(DISTINCT s.id)::int AS session_count,
         COUNT(m.id) FILTER (WHERE m.role = 'user')::int AS question_count,
         MAX(m.created_at) AS last_active_at
       FROM users u
       LEFT JOIN chat_sessions s ON s.user_id = u.id
       LEFT JOIN chat_messages m ON m.session_id = s.id
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT 6`,
    ),
  ]);

  const userSummary = userCounts[0];
  const sessionSummary = sessionCounts[0];
  const messageSummary = messageCounts[0];
  const totalUsers = Math.max(userSummary.total, 1);
  const activeUsers30d = userSummary.active_30d;

  return NextResponse.json({
    users: {
      ...userSummary,
      members: Math.max(userSummary.total - userSummary.admins, 0),
      adminShare: Number(((userSummary.admins / totalUsers) * 100).toFixed(1)),
      activationRate30d: Number(((activeUsers30d / totalUsers) * 100).toFixed(1)),
    },
    sessions: {
      ...sessionSummary,
      avgQuestionsPerSession: sessionSummary.avg_questions_per_session,
      avgSessionsPerUser: sessionSummary.avg_sessions_per_user,
    },
    messages: {
      ...messageSummary,
      avgQuestionsPerUser: messageSummary.avg_questions_per_user,
      responseRate: messageSummary.response_rate,
    },
    knowledgeBase: {
      chunks: chunkStats[0].chunks,
      avgLength: chunkStats[0].avg_length,
      maxLength: chunkStats[0].max_length,
    },
    messagesPerDay: dailyActivityRows.slice(-14).map((r) => ({
      day: r.day,
      messages: r.messages,
      userMessages: r.user_msgs,
    })),
    dailyActivity: dailyActivityRows.map((r) => ({
      day: r.day,
      messages: r.messages,
      userMessages: r.user_msgs,
      sessions: r.sessions,
      signups: r.signups,
    })),
    roleDistribution: roleDistributionRows,
    topUsers: topUsersRows.map((r) => ({
      id: r.id,
      email: r.email,
      name: r.name,
      role: r.role,
      messageCount: r.message_count,
      sessionCount: r.session_count,
      lastMessageAt: r.last_message_at,
    })),
    recentUsers: recentUsers.map((r) => ({
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
}
