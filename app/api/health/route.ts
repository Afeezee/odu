import { NextResponse } from "next/server";
import { rawSql } from "@/lib/db/client";

export const runtime = "nodejs";

export async function GET() {
  const started = Date.now();
  try {
    const rows = (await rawSql(
      `SELECT COUNT(*)::int AS chunks FROM document_chunks`,
    )) as Array<{ chunks: number }>;
    const chunkCount = rows[0]?.chunks ?? 0;
    return NextResponse.json({
      ok: true,
      db: "connected",
      documentChunks: chunkCount,
      latencyMs: Date.now() - started,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
