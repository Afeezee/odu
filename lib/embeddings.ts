/**
 * Shared local-embedding helper.
 *
 * Uses @xenova/transformers with Xenova/all-MiniLM-L6-v2 (384-dim, cosine).
 * Runs entirely in-process — no external API key required. The model
 * (~23 MB quantised) downloads to ./.transformers-cache on first use;
 * subsequent calls are cached.
 *
 * Confirm-before-use: the migration hard-codes vector(384). If you swap in a
 * different model, run getEmbeddingDimensions() at startup and match.
 */
import type { FeatureExtractionPipeline } from "@xenova/transformers";

export const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
export const EMBEDDING_DIM = 384;

let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = (async () => {
      // Dynamic import so bundlers don't try to statically resolve the model.
      const { pipeline, env } = await import("@xenova/transformers");
      // Keep the model cached locally between runs.
      env.cacheDir = "./.transformers-cache";
      // We don't need to hit the network after first download.
      env.allowRemoteModels = true;
      const p = await pipeline("feature-extraction", EMBEDDING_MODEL, {
        quantized: true,
      });
      return p as unknown as FeatureExtractionPipeline;
    })();
  }
  return pipelinePromise;
}

/** Embed a single string. Returns a 384-dim vector as a plain array. */
export async function embedText(text: string): Promise<number[]> {
  const pipe = await getPipeline();
  const output = await pipe(text, { pooling: "mean", normalize: true });
  // `Tensor.data` is a typed array; spread into a plain number[] so it
  // survives JSON serialisation and pgvector's `[a,b,c]` string format.
  return Array.from(output.data as Float32Array);
}

/** Embed many strings (used by the ingestion pipeline). */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  // The feature-extraction pipeline supports batching, but memory usage
  // scales with batch size × seq length. A tight loop keeps peak RAM low
  // and is fine for one-off ingestion of ~50–500 chunks.
  for (const t of texts) {
    out.push(await embedText(t));
  }
  return out;
}

/** Runtime sanity check — call once at startup if you've swapped models. */
export async function getEmbeddingDimensions(): Promise<number> {
  const v = await embedText("dimension probe");
  return v.length;
}
