import type { Config } from "drizzle-kit";
import { config } from "dotenv";
import { existsSync } from "node:fs";
for (const f of [".env", ".env.local"]) {
  if (existsSync(f)) config({ path: f, override: f === ".env.local" });
}

export default {
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
} satisfies Config;
