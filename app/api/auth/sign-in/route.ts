import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/password";
import { signSession, setSessionCookie } from "@/lib/auth";
import { isAllowlistedAdmin } from "@/lib/admin";

export const runtime = "nodejs";

interface Body {
  email?: string;
  password?: string;
}

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json({ error: "email and password are required" }, { status: 400 });
  }

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  // Constant-ish response to avoid revealing whether the email exists.
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return NextResponse.json({ error: "invalid email or password" }, { status: 401 });
  }

  let role = user.role as "user" | "admin";
  // Quiet auto-promotion: if this email is on the allowlist but the row still
  // says 'user' (e.g. account predates the env var), promote it now.
  if (role !== "admin" && isAllowlistedAdmin(user.email)) {
    await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
    role = "admin";
  }
  const token = await signSession({
    userId: user.id,
    email: user.email,
    role,
    name: user.name,
  });
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, email: user.email, role, name: user.name },
  });
  setSessionCookie(res.cookies, token);
  return res;
}
