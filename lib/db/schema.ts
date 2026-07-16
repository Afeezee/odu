import { sql } from "drizzle-orm";
import {
  pgTable,
  serial,
  text,
  timestamp,
  jsonb,
  integer,
  customType,
  index,
} from "drizzle-orm/pg-core";

// Custom pgvector column type — drizzle-orm has a built-in `vector()` in newer versions,
// but we define our own to keep the dimension explicit and avoid version drift.
const vector = customType<{
  data: number[];
  driverData: string;
  config: { dimensions: number };
}>({
  dataType(config) {
    const dims = (config as { dimensions?: number } | undefined)?.dimensions ?? 384;
    return `vector(${dims})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map((n) => Number(n));
  },
});

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: serial("id").primaryKey(),
    headingPath: text("heading_path").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 384 }).notNull(),
    sourceSection: text("source_section").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    headingPathIdx: index("document_chunks_heading_path_idx").on(t.headingPath),
    sourceSectionIdx: index("document_chunks_source_section_idx").on(t.sourceSection),
    // ivfflat/hnsw index is created in the raw migration (drizzle-kit doesn't emit
    // vector-specific index syntax); see drizzle/0000_pgvector_setup.sql
  }),
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(), // uuid
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: text("name"),
    role: text("role", { enum: ["user", "admin"] }).notNull().default("user"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
  }),
);

export const chatSessions = pgTable("chat_sessions", {
  id: text("id").primaryKey(), // uuid string generated in-app
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: serial("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant"] }).notNull(),
    content: text("content").notNull(),
    retrievedChunkIds: jsonb("retrieved_chunk_ids").$type<number[]>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    sessionIdx: index("chat_messages_session_idx").on(t.sessionId, t.createdAt),
  }),
);

export type DocumentChunk = typeof documentChunks.$inferSelect;
export type NewDocumentChunk = typeof documentChunks.$inferInsert;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Re-export for convenience
export { sql, integer };
