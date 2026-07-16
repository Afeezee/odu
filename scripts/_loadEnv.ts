/**
 * Load env vars for standalone scripts.
 *
 * Next.js reads `.env.local` automatically, but tsx-run scripts don't — dotenv
 * defaults to `.env`. Import this file at the top of every script to match
 * Next.js's precedence: .env.local overrides .env.
 */
import { config } from "dotenv";
import { existsSync } from "node:fs";
import path from "node:path";

const cwd = process.cwd();
for (const file of [".env", ".env.local"]) {
  const p = path.join(cwd, file);
  if (existsSync(p)) config({ path: p, override: file === ".env.local" });
}
