/**
 * Admin ingestion endpoint — upload a new handbook markdown file and reingest.
 *
 * Auth: simple shared-secret via `x-admin-secret` header or a `secret` form field.
 * TODO: swap for Clerk (or another auth provider) before exposing more broadly.
 */
import { NextRequest, NextResponse } from "next/server";
import { rawSql } from "@/lib/db/client";
import { chunkMarkdown, analyzeChunks } from "@/lib/chunking";
import { embedText, EMBEDDING_DIM } from "@/lib/embeddings";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 300; // ingestion can be slow the first time (model download)

export async function POST(req: NextRequest) {
  // Two auth paths:
  //  1. Session cookie with role === 'admin' (normal admin-page flow)
  //  2. x-admin-secret header matching ADMIN_SECRET (for CLI / curl usage)
  const session = await getSession();
  const headerSecret = req.headers.get("x-admin-secret");
  const expected = process.env.ADMIN_SECRET;
  const isAdmin = session?.role === "admin";
  const secretMatches = !!expected && headerSecret === expected;

  if (!isAdmin && !secretMatches) {
    return NextResponse.json(
      { error: session ? "admin role required" : "sign-in required" },
      { status: session ? 403 : 401 },
    );
  }

  const contentType = req.headers.get("content-type") ?? "";
  let markdown: string;
  let mode: "truncate" | "upsert" = "truncate";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }
    markdown = await file.text();
    if ((form.get("mode") as string | null) === "upsert") mode = "upsert";
  } else if (contentType.includes("application/json")) {
    const body = (await req.json()) as { markdown?: string; mode?: "truncate" | "upsert" };
    if (!body.markdown) {
      return NextResponse.json({ error: "markdown is required" }, { status: 400 });
    }
    markdown = body.markdown;
    if (body.mode === "upsert") mode = "upsert";
  } else {
    return NextResponse.json(
      { error: "content-type must be multipart/form-data or application/json" },
      { status: 400 },
    );
  }

  const report = analyzeChunks(chunkMarkdown(markdown));
  if (report.count === 0) {
    return NextResponse.json({ error: "no chunks produced from the file" }, { status: 400 });
  }

  // Embed
  const embedded: { headingPath: string; sourceSection: string; content: string; embedding: number[] }[] = [];
  for (const c of report.chunks) {
    const emb = await embedText(c.content);
    if (emb.length !== EMBEDDING_DIM) {
      return NextResponse.json(
        { error: `embedding model returned ${emb.length}-dim; schema is ${EMBEDDING_DIM}` },
        { status: 500 },
      );
    }
    embedded.push({ ...c, embedding: emb });
  }

  // Write
  if (mode === "upsert") {
    for (const r of embedded) {
      await rawSql(`DELETE FROM document_chunks WHERE heading_path = $1`, [r.headingPath]);
    }
  } else {
    await rawSql(`TRUNCATE TABLE document_chunks RESTART IDENTITY`);
  }

  const BATCH = 20;
  for (let s = 0; s < embedded.length; s += BATCH) {
    const slice = embedded.slice(s, s + BATCH);
    const values: string[] = [];
    const params: unknown[] = [];
    slice.forEach((r, idx) => {
      const base = idx * 4;
      values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}::vector)`);
      params.push(r.headingPath, r.sourceSection, r.content, `[${r.embedding.join(",")}]`);
    });
    await rawSql(
      `INSERT INTO document_chunks (heading_path, source_section, content, embedding) VALUES ${values.join(", ")}`,
      params,
    );
  }

  return NextResponse.json({
    ok: true,
    mode,
    chunks: report.count,
    averageLength: report.averageLength,
    warnings: report.warnings,
  });
}
