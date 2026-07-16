import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { signSession, setSessionCookie } from "@/lib/auth";
import { isAllowlistedAdmin } from "@/lib/admin";

export const runtime = "nodejs";

interface Body {
  email?: string;
  password?: string;
  name?: string;
  adminSecret?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const name = body.name?.trim() || null;
  const adminSecret = body.adminSecret?.trim() || "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "please enter a valid email address" }, { status: 400 });
  }
  if (!password || password.length < 8) {
    return NextResponse.json({ error: "password must be at least 8 characters" }, { status: 400 });
  }

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ error: "an account with that email already exists" }, { status: 409 });
  }

  const grantedBySecret =
    !!adminSecret && !!process.env.ADMIN_SECRET && adminSecret === process.env.ADMIN_SECRET;
  const grantedByAllowlist = isAllowlistedAdmin(email);
  const role: "user" | "admin" = grantedBySecret || grantedByAllowlist ? "admin" : "user";

  const passwordHash = await hashPassword(password);
  const id = randomUUID();
  await db.insert(users).values({ id, email, passwordHash, name, role });

  const token = await signSession({ userId: id, email, role, name });
  const res = NextResponse.json({ ok: true, user: { id, email, role, name } });
  setSessionCookie(res.cookies, token);
  return res;
}
