import { NextResponse } from "next/server";
import { getSession, type SessionPayload } from "./auth";

/**
 * Guard for /api/admin/* routes. Returns either a session (admin-authorised)
 * or a NextResponse to short-circuit with. Usage:
 *
 *   const gate = await requireAdmin();
 *   if ("response" in gate) return gate.response;
 *   const session = gate.session;
 */
export async function requireAdmin(): Promise<
  { session: SessionPayload } | { response: NextResponse }
> {
  const session = await getSession();
  if (!session) {
    return { response: NextResponse.json({ error: "sign-in required" }, { status: 401 }) };
  }
  if (session.role !== "admin") {
    return { response: NextResponse.json({ error: "admin role required" }, { status: 403 }) };
  }
  return { session };
}
