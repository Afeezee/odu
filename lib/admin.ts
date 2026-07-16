/**
 * Env-based admin allowlist. Any email in ADMIN_EMAILS is granted the admin
 * role on sign-up, and quietly promoted on sign-in if their DB row still says
 * 'user' (e.g. the account was created before the env var was set).
 */
export function isAllowlistedAdmin(email: string): boolean {
  const raw = process.env.ADMIN_EMAILS ?? "";
  if (!raw) return false;
  const target = email.trim().toLowerCase();
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .some((e) => e && e === target);
}
