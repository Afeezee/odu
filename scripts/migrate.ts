/**
 * Applies the raw SQL migrations in ./drizzle in filename order.
 *
 * Neon-http's tagged-template client only accepts a single statement per call,
 * so we split each .sql file on `;` (respecting quoted semicolons) and apply
 * statements sequentially. Migrations are idempotent (IF NOT EXISTS guards),
 * so re-running is safe.
 *
 * Usage: `npm run db:migrate`
 */
import "./_loadEnv";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";

function splitSqlStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = "";
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;
  let inBlockComment = false;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    const next = sql[i + 1];
    if (inLineComment) {
      buf += c;
      if (c === "\n") inLineComment = false;
      continue;
    }
    if (inBlockComment) {
      buf += c;
      if (c === "*" && next === "/") {
        buf += next;
        i++;
        inBlockComment = false;
      }
      continue;
    }
    if (!inSingle && !inDouble && c === "-" && next === "-") {
      inLineComment = true;
      buf += c;
      continue;
    }
    if (!inSingle && !inDouble && c === "/" && next === "*") {
      inBlockComment = true;
      buf += c;
      continue;
    }
    if (!inDouble && c === "'") inSingle = !inSingle;
    else if (!inSingle && c === '"') inDouble = !inDouble;
    if (c === ";" && !inSingle && !inDouble) {
      const trimmed = buf.trim();
      if (trimmed) out.push(trimmed);
      buf = "";
    } else {
      buf += c;
    }
  }
  const tail = buf.trim();
  if (tail) out.push(tail);
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }
  const sql = neon(process.env.DATABASE_URL);
  const dir = path.resolve(process.cwd(), "drizzle");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  if (files.length === 0) {
    console.log("No migrations found in", dir);
    return;
  }
  for (const f of files) {
    console.log(`\n→ Applying ${f}`);
    const content = readFileSync(path.join(dir, f), "utf8");
    const statements = splitSqlStatements(content);
    for (const stmt of statements) {
      try {
        // neon-http tagged-template also accepts (text, params) form.
        await sql(stmt);
        const firstLine = stmt.split("\n")[0].slice(0, 80);
        console.log(`  ✓ ${firstLine}${stmt.length > 80 ? "…" : ""}`);
      } catch (err) {
        console.error(`  ✗ Failed: ${stmt.slice(0, 120)}…`);
        throw err;
      }
    }
  }
  console.log("\nAll migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
