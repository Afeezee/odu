/**
 * pgvector retrieval — cosine similarity search over document_chunks.
 * The neon-http tagged-template client is convenient for one-shot parameterised
 * queries; drizzle's query builder doesn't express `embedding <=> $1::vector`
 * neatly so we drop to raw SQL here.
 */
import { rawSql } from "./db/client";
import type { RetrievedChunk } from "./groq";

export async function retrieveTopK(embedding: number[], k = 5): Promise<RetrievedChunk[]> {
  const vec = `[${embedding.join(",")}]`;
  // pgvector's `<=>` is cosine distance (0 = identical). Similarity = 1 - distance.
  // neon-http's tagged-template function also accepts (text, params).
  const rows = (await rawSql(
    `SELECT id, heading_path, source_section, content,
            1 - (embedding <=> $1::vector) AS similarity
     FROM document_chunks
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vec, k],
  )) as Array<{
    id: number;
    heading_path: string;
    source_section: string;
    content: string;
    similarity: number;
  }>;

  return rows.map((r) => ({
    id: r.id,
    headingPath: r.heading_path,
    sourceSection: r.source_section,
    content: r.content,
    similarity: Number(r.similarity),
  }));
}
