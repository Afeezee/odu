import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

neonConfig.fetchConnectionCache = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Create .env.local with a Neon connection string (include ?sslmode=require).",
  );
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Raw tagged-template client for pgvector similarity queries that Drizzle's
// query builder doesn't express cleanly.
export const rawSql = sql;

export type Db = typeof db;
