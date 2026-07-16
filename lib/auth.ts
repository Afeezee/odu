/**
 * Session helpers — HttpOnly signed cookie with a small JWT payload.
 *
 * We use `jose` (pure JS, Edge-runtime safe) so the same helper can run in
 * middleware.ts (Edge) and in Node API routes.
 */
import { SignJWT, jwtVerify } from "jose";
import type { NextRequest } from "next/server";
import type { ResponseCookies, RequestCookies } from "next/dist/server/web/spec-extension/cookies";
import { cookies } from "next/headers";

export const COOKIE_NAME = "odu_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const ISSUER = "odu-oui-assistant";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "user" | "admin";
  name: string | null;
}

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 24) {
    throw new Error(
      "SESSION_SECRET must be set in .env.local (at least 24 characters). Generate one with `openssl rand -base64 48`.",
    );
  }
  return new TextEncoder().encode(s);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE}s`)
    .sign(getSecret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), { issuer: ISSUER });
    const { userId, email, role, name } = payload as unknown as SessionPayload;
    if (!userId || !email || (role !== "user" && role !== "admin")) return null;
    return { userId, email, role, name: name ?? null };
  } catch {
    return null;
  }
}

/** Read the session from server components / route handlers. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(COOKIE_NAME)?.value);
}

/** Read the session from middleware (Edge). */
export async function getSessionFromRequest(req: NextRequest): Promise<SessionPayload | null> {
  return verifySession(req.cookies.get(COOKIE_NAME)?.value);
}

/** Attach a session cookie to a response's cookies bag. */
export function setSessionCookie(
  jar: ResponseCookies | RequestCookies,
  token: string,
) {
  jar.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export function clearSessionCookie(jar: ResponseCookies | RequestCookies) {
  jar.set({
    name: COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
