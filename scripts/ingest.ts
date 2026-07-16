/**
 * OUI handbook ingestion pipeline.
 *
 * Reads a cleaned markdown file, splits it into heading-aware chunks,
 * embeds each with Xenova/all-MiniLM-L6-v2, and writes them to Neon.
 *
 * Idempotent: truncates document_chunks before insert (default) or,
 * with --upsert, replaces rows keyed by heading_path.
 *
 * Usage:
 *   npm run ingest -- ./path/to/handbook.md
 *   npm run ingest -- ./path/to/handbook.md --upsert
 */
import "./_loadEnv";
import { readFileSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { chunkMarkdown, analyzeChunks } from "../lib/chunking";
import { embedText, EMBEDDING_DIM, getEmbeddingDimensions } from "../lib/embeddings";

function parseArgs(argv: string[]) {
  const positional = argv.filter((a) => !a.startsWith("--"));
  const flags = new Set(argv.filter((a) => a.startsWith("--")));
  return {
    file: positional[0],
    upsert: flags.has("--upsert"),
  };
}

async function main() {
  const { file, upsert } = parseArgs(process.argv.slice(2));
  if (!file) {
    console.error("Usage: npm run ingest -- <path-to-markdown> [--upsert]");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL not set");
  }

  const abs = path.resolve(process.cwd(), file);
  console.log(`Reading ${abs}`);
  const md = readFileSync(abs, "utf8");

  console.log("Chunking…");
  const report = analyzeChunks(chunkMarkdown(md));
  console.log(
    `  ${report.count} chunks | avg ${report.averageLength} chars | min ${report.minLength} | max ${report.maxLength}`,
  );
  if (report.warnings.length > 0) {
    console.log(`  ⚠ ${report.warnings.length} data-quality warnings:`);
    for (const w of report.warnings) {
      console.log(`     - [${w.length} chars] ${w.headingPath} — ${w.reason}`);
    }
  }

  console.log(`\nLoading embedding model (${EMBEDDING_DIM}-dim expected)…`);
  const dims = await getEmbeddingDimensions();
  if (dims !== EMBEDDING_DIM) {
    throw new Error(
      `Model returned ${dims}-dim vectors but the schema declares vector(${EMBEDDING_DIM}). ` +
        `Update lib/db/schema.ts and drizzle/0000_pgvector_setup.sql before ingesting.`,
    );
  }
  console.log(`  ✓ model produces ${dims}-dim vectors`);

  console.log("\nEmbedding chunks…");
  const rows: { headingPath: string; sourceSection: string; content: string; embedding: number[] }[] = [];
  let i = 0;
  for (const c of report.chunks) {
    i++;
    const emb = await embedText(c.content);
    rows.push({ ...c, embedding: emb });
    if (i % 5 === 0 || i === report.chunks.length) {
      process.stdout.write(`\r  ${i}/${report.chunks.length}`);
    }
  }
  process.stdout.write("\n");

  const sql = neon(process.env.DATABASE_URL);

  if (upsert) {
    console.log("\nUpserting rows by heading_path…");
    // Delete rows whose heading_path is being re-ingested, then insert.
    // Safer than DELETE-ALL because it preserves any chunks whose heading
    // paths were manually curated but aren't present in the new file.
    for (const r of rows) {
      await sql(`DELETE FROM document_chunks WHERE heading_path = $1`, [r.headingPath]);
    }
  } else {
    console.log("\nTruncating document_chunks (pass --upsert to keep old rows)…");
    await sql(`TRUNCATE TABLE document_chunks RESTART IDENTITY`);
  }

  console.log("Inserting…");
  // Batch inserts to keep request sizes reasonable.
  const BATCH = 20;
  for (let s = 0; s < rows.length; s += BATCH) {
    const slice = rows.slice(s, s + BATCH);
    const values: string[] = [];
    const params: unknown[] = [];
    slice.forEach((r, idx) => {
      const base = idx * 4;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector)`);
      params.push(r.headingPath, r.sourceSection, r.content, `[${r.embedding.join(",")}]`);
    });
    const stmt = `INSERT INTO document_chunks (heading_path, source_section, content, embedding) VALUES ${values.join(
      ", ",
    )}`;
    await sql(stmt, params);
    process.stdout.write(`\r  ${Math.min(s + BATCH, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");

  console.log("\n✓ Ingestion complete.");
  console.log(`  chunks:        ${report.count}`);
  console.log(`  avg length:    ${report.averageLength} chars`);
  console.log(`  warnings:      ${report.warnings.length}`);
  console.log(`  mode:          ${upsert ? "upsert" : "truncate + insert"}`);
}

main().catch((err) => {
  console.error("\nIngestion failed:", err);
  process.exit(1);
});
