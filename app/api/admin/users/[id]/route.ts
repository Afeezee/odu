import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { isAllowlistedAdmin } from "@/lib/admin";

export const runtime = "nodejs";

interface PatchBody {
  role?: "user" | "admin";
  name?: string | null;
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { session } = gate;
  const { id } = await ctx.params;

  let body: PatchBody;
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });

  // Guardrails
  if (body.role) {
    if (body.role !== "user" && body.role !== "admin") {
      return NextResponse.json({ error: "role must be 'user' or 'admin'" }, { status: 400 });
    }
    if (target.id === session.userId && body.role !== "admin") {
      return NextResponse.json(
        { error: "you cannot demote yourself" },
        { status: 400 },
      );
    }
    if (body.role === "user" && isAllowlistedAdmin(target.email)) {
      return NextResponse.json(
        { error: "this email is admin-allowlisted in server config; remove it from ADMIN_EMAILS first" },
        { status: 400 },
      );
    }
  }

  const patch: Partial<{ role: "user" | "admin"; name: string | null }> = {};
  if (body.role) patch.role = body.role;
  if (body.name !== undefined) patch.name = body.name || null;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "no fields to update" }, { status: 400 });
  }

  await db.update(users).set(patch).where(eq(users.id, id));
  const [updated] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return NextResponse.json({
    ok: true,
    user: {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role,
      createdAt: updated.createdAt,
    },
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const gate = await requireAdmin();
  if ("response" in gate) return gate.response;
  const { session } = gate;
  const { id } = await ctx.params;

  if (id === session.userId) {
    return NextResponse.json({ error: "you cannot delete your own account" }, { status: 400 });
  }

  const [target] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!target) return NextResponse.json({ error: "user not found" }, { status: 404 });
  if (isAllowlistedAdmin(target.email)) {
    return NextResponse.json(
      { error: "this email is admin-allowlisted in server config; remove it from ADMIN_EMAILS first" },
      { status: 400 },
    );
  }

  // chat_sessions.user_id has ON DELETE SET NULL, and chat_messages cascade
  // from their session — so the user's conversations become orphaned rather
  // than lost. That's intentional (deletable but auditable).
  await db.delete(users).where(eq(users.id, id));
  return NextResponse.json({ ok: true });
}
