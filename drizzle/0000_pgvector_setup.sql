-- Enable the pgvector extension. Neon supports this on all tiers.
CREATE EXTENSION IF NOT EXISTS vector;

-- chat_sessions
CREATE TABLE IF NOT EXISTS "chat_sessions" (
    "id" text PRIMARY KEY,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "last_active_at" timestamp DEFAULT now() NOT NULL
);

-- document_chunks
CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" serial PRIMARY KEY,
    "heading_path" text NOT NULL,
    "content" text NOT NULL,
    "embedding" vector(384) NOT NULL,
    "source_section" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "document_chunks_heading_path_idx"
    ON "document_chunks" ("heading_path");

CREATE INDEX IF NOT EXISTS "document_chunks_source_section_idx"
    ON "document_chunks" ("source_section");

-- Cosine-distance HNSW index for fast approximate nearest neighbour search.
-- HNSW gives better recall than IVFFlat at this scale (< 10k chunks) and
-- doesn't need a build-time training step.
CREATE INDEX IF NOT EXISTS "document_chunks_embedding_idx"
    ON "document_chunks"
    USING hnsw ("embedding" vector_cosine_ops);

-- chat_messages
CREATE TABLE IF NOT EXISTS "chat_messages" (
    "id" serial PRIMARY KEY,
    "session_id" text NOT NULL REFERENCES "chat_sessions"("id") ON DELETE CASCADE,
    "role" text NOT NULL,
    "content" text NOT NULL,
    "retrieved_chunk_ids" jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "chat_messages_session_idx"
    ON "chat_messages" ("session_id", "created_at");
