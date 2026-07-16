# Odu — OUI Intelligent Assistant

A production-ready RAG (Retrieval-Augmented Generation) chatbot for **Oduduwa University**, built as the final-year Computer Engineering project *"Design and Implementation of an Intelligent Chatbot for University Information."*

Odu answers questions about OUI's programmes, staff, fees, admission/graduation policies, and contact numbers using the official Student Handbook as its knowledge base, with sources cited on every response.

---

## Stack

| Layer            | Technology                                                              |
| ---------------- | ----------------------------------------------------------------------- |
| Framework        | Next.js 15 (App Router) + TypeScript                                    |
| Database         | Neon serverless Postgres with `pgvector`                                |
| ORM              | Drizzle ORM (schema + typed queries)                                    |
| Embeddings       | `@xenova/transformers` running `Xenova/all-MiniLM-L6-v2` locally (384-d)|
| LLM              | Groq — `llama-3.3-70b-versatile` (streaming)                            |
| Styling          | Tailwind CSS, custom OUI theme (maroon / gold / navy), light + dark    |
| Deployment       | Vercel (frontend/API) + Neon (database)                                 |

---

## Prerequisites

1. **Node.js 20+** (Node 22 recommended).
2. A **Neon** project — [neon.tech](https://neon.tech). Free tier is enough for a demo. Copy the pooled connection string; make sure it ends with `?sslmode=require`.
3. A **Groq API key** — [console.groq.com/keys](https://console.groq.com/keys). Free tier is sufficient for the defense demo (mind the rate limits, see *Known limitations*).

---

## Setup

```bash
# 1. Install dependencies
npm install

# 1a. Windows only: if `npm install` failed on `sharp`'s native build, install
#     with `--ignore-scripts` and then fetch just sharp's prebuilt binary:
#       npm install --ignore-scripts
#       npm rebuild sharp --foreground-scripts
#     (Xenova/transformers eagerly requires sharp even for text-only embeddings.)

# 2. Configure environment
cp .env.example .env.local
# then edit .env.local and fill in:
#   DATABASE_URL    — your Neon connection string (include ?sslmode=require)
#   GROQ_API_KEY    — your Groq key
#   SESSION_SECRET  — any long random string used to sign auth cookies
#   ADMIN_SECRET    — optional; lets you bootstrap an admin during sign-up and call ingestion via header/CLI
#   ADMIN_EMAILS    — optional comma-separated admin email allowlist

# 3. Enable pgvector and create tables on Neon
npm run db:migrate

# 4. Ingest the handbook (first run also downloads the ~23 MB embedding model into ./.transformers-cache)
npm run ingest -- ./path/to/oduduwa_university_handbook_cleaned.md

# 5. Start the dev server
npm run dev
# → http://localhost:3000
```

Open the landing page, click **Start Chatting**, and ask something like *"What are the graduation requirements for a UTME-admitted student?"*.

### Verifying the deployment

- Visit `/api/health` — should return `{ ok: true, db: "connected", documentChunks: <N>, ... }`.
- If `documentChunks` is `0`, re-run the ingestion step.

---

## Updating the knowledge base

Any time the handbook changes:

**Option A — CLI (recommended when the file is on your machine):**

```bash
npm run ingest -- ./path/to/new-handbook.md            # truncate + re-insert
npm run ingest -- ./path/to/new-handbook.md --upsert   # replace only changed heading paths
```

**Option B — Admin UI:** visit `/admin/knowledge` as an authenticated admin, upload the new `.md`, and choose truncate or upsert. This runs on the server so you don't need local Node.

Both paths use the same code (`lib/chunking.ts` + `lib/embeddings.ts` + `app/api/admin/ingest/route.ts` / `scripts/ingest.ts`).

---

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import the repo into Vercel.
3. Add the three env vars (`DATABASE_URL`, `GROQ_API_KEY`, `ADMIN_SECRET`) in the Vercel project settings.
4. Deploy. The first request will lazy-download the embedding model into Vercel's function filesystem; subsequent requests are fast.
5. On production, run migrations once from your machine (`npm run db:migrate` against the production `DATABASE_URL`) and then either run `npm run ingest` or use the `/admin/knowledge` page to load the handbook into the production DB.

The `/api/chat` route uses the Node runtime (not Edge) because `@xenova/transformers` depends on `onnxruntime-node`. Its `maxDuration` is set to 30s — plenty for Groq's fast streaming.

---

## Architecture (for the methodology chapter)

```
                              ┌──────────────────────────┐
                              │  Handbook markdown file  │
                              └────────────┬─────────────┘
                                           │
                             chunkMarkdown │  (H2/H3-aware, tables preserved)
                                           ▼
                              ┌──────────────────────────┐
                              │  Chunks + heading paths  │
                              └────────────┬─────────────┘
                                           │
                             embedBatch    │  (all-MiniLM-L6-v2, local, 384-d)
                                           ▼
                              ┌──────────────────────────┐
                              │  document_chunks (Neon)  │
                              │  + HNSW cosine index     │
                              └──────────────────────────┘
                                           ▲
                                           │ pgvector `<=>`
                                           │ top-5 similarity search
    ┌────────┐      ┌────────────┐         │
    │ User   │──────│  /api/chat │─────────┘
    │ (chat) │◀─SSE─│            │
    └────────┘      │            │──── Groq (Llama 3.3 70B, streaming)
                    │            │        with cited-context system prompt
                    │            │──── chat_messages + chat_sessions (Neon)
                    └────────────┘
```

**Retrieval-Augmented Generation flow (per user message):**

1. Embed the user's question with the same local model used at ingest time.
2. `SELECT ... ORDER BY embedding <=> $query LIMIT 5` retrieves the 5 most cosine-similar chunks.
3. Build a system prompt that includes those 5 chunks tagged `[Source 1..5]` with their heading paths, plus strict instructions to answer *only* from that context and cite sources.
4. Call Groq with the system prompt + last 4 turns of conversation history + the new question, with `stream: true`.
5. Stream tokens to the browser via Server-Sent Events. The frontend renders tokens as they arrive and exposes an expandable **Sources** panel underneath.
6. Persist both messages (with the retrieved chunk IDs) to `chat_messages` for transparency and follow-up context.

**Why local embeddings + Groq (instead of OpenAI/Anthropic for both):**
- Cost: zero embedding cost; Groq's free tier covers the demo generation cost.
- Latency: Groq is the fastest hosted LLM inference in production. Responses feel instant.
- Sovereignty: the knowledge base never leaves your infrastructure until an inference call.

**Why Neon + pgvector (instead of a dedicated vector DB):**
- Single source of truth: chat history and vector embeddings live in the same Postgres. No sync bugs.
- Neon's HTTP driver works from Vercel serverless functions without a connection pool.
- The scale (~50 chunks now, growing to maybe a few thousand) fits comfortably in a single HNSW index.

---

## Project layout

```
/app
  page.tsx               Landing page
  chat/page.tsx          Chat UI (streaming, sources, session persistence)
  admin/page.tsx         Admin dashboard
  admin/analytics/page.tsx  Website analytics view
  admin/users/page.tsx   User management and role promotion
  admin/knowledge/page.tsx  Handbook re-ingestion UI
  api/chat/route.ts      RAG + streaming Groq completion
  api/admin/ingest/…     Server-side ingestion endpoint
  api/health/route.ts    DB connectivity check
/lib
  db/schema.ts           Drizzle schema (document_chunks, chat_sessions, chat_messages)
  db/client.ts           Neon HTTP + Drizzle client
  chunking.ts            Heading-aware markdown splitter
  embeddings.ts          Xenova/all-MiniLM-L6-v2 wrapper
  retrieval.ts           pgvector cosine similarity search
  groq.ts                Groq client + system prompt + streaming helper
/scripts
  migrate.ts             Applies drizzle/*.sql migrations
  ingest.ts              CLI ingestion pipeline
/drizzle
  0000_pgvector_setup.sql   Extension + tables + HNSW index
/components               ChatMessage, ChatInput, SourcesPanel, Header, Footer, ThemeToggle, OuiLogo
tailwind.config.ts        OUI theme colors
```

---

## Known limitations

- **Knowledge is a snapshot.** Odu only knows what was in the last ingested markdown file. Deadlines, fees, and staff lists go stale — re-ingest whenever the handbook is updated.
- **Local embedding quality.** `all-MiniLM-L6-v2` is small (384-d, quantised, ~23 MB) and fast, but noticeably less accurate than hosted alternatives on nuanced queries. **Upgrade path:** switch `lib/embeddings.ts` to Voyage AI's `voyage-3` (1024-d) or OpenAI's `text-embedding-3-small` (1536-d) — you'll need to update the `vector(384)` dimension in the schema and reindex.
- **Groq free-tier rate limits.** For a live demo (defense presentation), the free tier's requests-per-minute is generous but not unlimited — if you expect a crowd hammering the chat, upgrade to a paid tier or add a queue/backoff. The system prompt keeps completions under ~1024 tokens to leave headroom.
- **No auth on the public chat.** Anyone can hit `/api/chat`. For a public deployment, add rate limiting (e.g. Vercel's built-in, or Upstash) and consider a stronger identity provider for `/admin` than the lightweight cookie-based flow used here.
- **No hallucination guardrail beyond the prompt.** The system prompt tells Llama to only answer from context and to say "I don't have that information…" otherwise. Llama 3.3 70B is generally faithful to this, but a stray hallucination is always possible — the cited sources panel lets a user verify.
- **Ingestion downloads the model on first use.** ~23 MB the first time (locally cached to `./.transformers-cache`, on Vercel to the function's writable tmp). Cold starts on Vercel will be slower until the model is cached.

---

## Scripts reference

```bash
npm run dev            # Next.js dev server
npm run build          # Production build
npm run start          # Serve the production build
npm run db:generate    # Drizzle-Kit — generate SQL from schema changes (optional)
npm run db:migrate     # Apply all drizzle/*.sql migrations to Neon
npm run ingest -- <file> [--upsert]   # Ingest / re-ingest the handbook
```

---

## Acknowledgements

- Oduduwa University — for the source handbook.
- Neon — free-tier serverless Postgres with `pgvector`.
- Groq — the fastest hosted Llama 3.3 inference in production.
- Xenova — for making transformer models runnable in plain Node.
- The Drizzle ORM team.
