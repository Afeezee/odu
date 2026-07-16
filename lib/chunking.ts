/**
 * Markdown chunking for the OUI handbook.
 *
 * Strategy: split the document at H2 / H3 boundaries and treat each
 * lowest-level heading section as one chunk. This preserves logical
 * boundaries — a department's course list, a fee table, one policy —
 * rather than slicing mid-paragraph. Markdown tables inside a section
 * are left intact.
 *
 * Each chunk carries:
 *   - headingPath: "H2 > H3" (or just "H2" if no H3 children)
 *   - sourceSection: the H2 title (for citation / filtering)
 *   - content: the H3/H2 heading line + all body text under it
 */

export interface RawChunk {
  headingPath: string;
  sourceSection: string;
  content: string;
}

const H1_RE = /^#\s+(.+?)\s*$/;
const H2_RE = /^##\s+(.+?)\s*$/;
const H3_RE = /^###\s+(.+?)\s*$/;

function classifyHeading(line: string): { level: 1 | 2 | 3; title: string } | null {
  let m = line.match(H1_RE);
  if (m) return { level: 1, title: m[1] };
  m = line.match(H2_RE);
  if (m) return { level: 2, title: m[1] };
  m = line.match(H3_RE);
  if (m) return { level: 3, title: m[1] };
  return null;
}

/**
 * Split a markdown string into chunks by heading boundaries.
 * - H1: treated as document title, ignored for chunk boundaries.
 * - H2 with no H3 children: one chunk for the whole H2.
 * - H2 with H3 children: the pre-H3 body under the H2 becomes an "Overview"
 *   chunk, then each H3 subsection becomes its own chunk.
 */
export function chunkMarkdown(markdown: string): RawChunk[] {
  const lines = markdown.split(/\r?\n/);
  const chunks: RawChunk[] = [];

  let currentH2: string | null = null;
  let currentH3: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (!currentH2) {
      buffer = [];
      return;
    }
    const content = buffer.join("\n").trim();
    if (!content) {
      buffer = [];
      return;
    }
    // Drop "H2-only" chunks whose body is nothing more than the H2 heading line
    // itself — those happen when an H2 has no prelude before its first H3 child
    // (e.g. "## COLLEGE OF ENGINEERING\n### Department of ..."). The H3 chunks
    // that follow already carry the H2 in their headingPath.
    if (!currentH3) {
      const headingLine = `## ${currentH2}`;
      const withoutHeading = content.replace(headingLine, "").trim();
      if (withoutHeading.length === 0) {
        buffer = [];
        return;
      }
    }
    const headingPath = currentH3 ? `${currentH2} > ${currentH3}` : currentH2;
    chunks.push({
      headingPath,
      sourceSection: currentH2,
      content,
    });
    buffer = [];
  };

  for (const line of lines) {
    const heading = classifyHeading(line);
    if (heading?.level === 1) {
      // Document title — ignore.
      continue;
    }
    if (heading?.level === 2) {
      flush();
      currentH2 = heading.title;
      currentH3 = null;
      // Include the H2 heading in the chunk body so the LLM sees the section name.
      buffer.push(line);
      continue;
    }
    if (heading?.level === 3) {
      flush();
      currentH3 = heading.title;
      buffer.push(line);
      continue;
    }
    // Horizontal rules serve as separators in the source; skip them.
    if (/^---+\s*$/.test(line)) continue;
    buffer.push(line);
  }
  flush();

  return chunks;
}

export interface ChunkQualityWarning {
  headingPath: string;
  reason: string;
  length: number;
}

export interface ChunkingReport {
  chunks: RawChunk[];
  count: number;
  averageLength: number;
  minLength: number;
  maxLength: number;
  warnings: ChunkQualityWarning[];
}

const MIN_USEFUL_CHARS = 80;
const MAX_REASONABLE_CHARS = 6000;

export function analyzeChunks(chunks: RawChunk[]): ChunkingReport {
  if (chunks.length === 0) {
    return { chunks, count: 0, averageLength: 0, minLength: 0, maxLength: 0, warnings: [] };
  }
  const lengths = chunks.map((c) => c.content.length);
  const total = lengths.reduce((a, b) => a + b, 0);
  const warnings: ChunkQualityWarning[] = [];
  for (const c of chunks) {
    if (c.content.length < MIN_USEFUL_CHARS) {
      warnings.push({
        headingPath: c.headingPath,
        reason: "suspiciously short (< 80 chars)",
        length: c.content.length,
      });
    } else if (c.content.length > MAX_REASONABLE_CHARS) {
      warnings.push({
        headingPath: c.headingPath,
        reason: "very long (> 6000 chars) — consider a finer heading split",
        length: c.content.length,
      });
    }
  }
  return {
    chunks,
    count: chunks.length,
    averageLength: Math.round(total / chunks.length),
    minLength: Math.min(...lengths),
    maxLength: Math.max(...lengths),
    warnings,
  };
}
