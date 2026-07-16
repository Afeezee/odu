-- Users table for password-based auth.
CREATE TABLE IF NOT EXISTS "users" (
    "id" text PRIMARY KEY,
    "email" text NOT NULL UNIQUE,
    "password_hash" text NOT NULL,
    "name" text,
    "role" text NOT NULL DEFAULT 'user',
    "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "users_email_idx" ON "users" ("email");

-- Link chat sessions to a user (nullable — sessions created before auth
-- was introduced stay valid, they just don't have an owner).
ALTER TABLE "chat_sessions"
    ADD COLUMN IF NOT EXISTS "user_id" text
    REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "chat_sessions_user_idx"
    ON "chat_sessions" ("user_id");
