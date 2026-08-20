/**
 * Groq client + shared chat-completion helper.
 *
 * Model: qwen/qwen3.6-27b with reasoning_effort="none".
 *
 * Why not gpt-oss-120b: gpt-oss models always emit a silent reasoning phase
 * before writing the visible answer. On short replies that phase is quick
 * and the UI feels fast; on longer answers the model reasons noticeably
 * longer while the UI shows nothing — looks like a hang, then a burst of
 * tokens arrives. Qwen 3.6 supports reasoning_effort="none" which turns
 * the reasoning phase off entirely, so tokens start flowing at ~1.2s and
 * keep streaming smoothly regardless of answer length.
 *
 * To rotate later, set GROQ_MODEL in .env.local — see the current list at
 * https://console.groq.com/docs/models.
 */
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  // Don't throw at import time — server routes should fail with a clean 500
  // message instead of crashing the whole build. We check per-request.
}

// Env-overridable so ops can rotate models without a code change / deploy.
export const GROQ_MODEL = process.env.GROQ_MODEL || "qwen/qwen3.6-27b";

let client: Groq | null = null;
export function getGroq(): Groq {
  if (!process.env.GROQ_API_KEY) {
    throw new Error(
      "GROQ_API_KEY is not set. Add it to .env.local — get one at https://console.groq.com/keys",
    );
  }
  if (!client) client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

export interface RetrievedChunk {
  id: number;
  headingPath: string;
  sourceSection: string;
  content: string;
  similarity: number;
}

export function buildSystemPrompt(chunks: RetrievedChunk[]): string {
  const contextBlocks = chunks
    .map((c, i) => `[Reference ${i + 1} — ${c.headingPath}]\n${c.content}`)
    .join("\n\n---\n\n");

  return `You are Odu, the intelligent assistant for Oduduwa University (OUI), a private university in Nigeria.

You answer questions from students, prospective students, parents, and staff using ONLY the reference material below, which is drawn from the official OUI Student Handbook.

RULES — follow strictly:
1. Answer only from the provided reference material. Do not use outside knowledge about other universities or make up facts about OUI.
2. Do NOT mention "sources", "references", "context", "the handbook", "Reference 1", or any bracketed tags in your answer. Just answer the question directly and naturally, as if you know the material. The user should never see reference markers.
3. If the reference material does not contain the answer, respond with a short natural sentence like:
   "I don't have that information — please check with [the most relevant OUI office, e.g. the Registrar, Bursary, the Head of your Department, or the Admissions Office]."
   Do not guess. Do not apologise excessively.
4. For fees, deadlines, and admission requirements, add a brief natural reminder that figures may have been updated and the student should confirm with the Bursary or Registrar. Do not phrase this as a citation.
5. Keep answers concise and well-structured. Use short paragraphs or bullet points. Preserve any tabular information in a readable way.
6. Speak warmly and professionally, as a helpful university-office staff member would. Never invent staff names, phone numbers, or fees.

REFERENCE MATERIAL (retrieved from the OUI Handbook — most relevant sections first, for your use only, never mentioned to the user):

${contextBlocks}

END OF REFERENCE MATERIAL. Answer the user's question using only what is above, without mentioning the reference numbers.`;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

interface CompletionParams {
  systemPrompt: string;
  history: ChatTurn[];
  userMessage: string;
}

function buildMessages(params: CompletionParams) {
  return [
    { role: "system" as const, content: params.systemPrompt },
    ...params.history.map((t) => ({ role: t.role, content: t.content })),
    { role: "user" as const, content: params.userMessage },
  ];
}

// Qwen 3.6 defaults to a chain-of-thought reasoning phase that emits no
// visible content until it's done. For a Q&A chatbot we want direct answers,
// so reasoning_effort="none" turns the thinking phase off entirely. The
// Groq SDK doesn't type this key yet, so it's spread in via a cast — the
// API forwards unknown keys verbatim.
const REASONING_EXTRAS = { reasoning_effort: "none" } as unknown as Record<string, never>;

/**
 * Non-streaming completion. RAG pipelines already have variable latency from
 * embedding + retrieval; a single "here's your answer" response tends to feel
 * better than a token-by-token stream that stalls mid-answer. The client
 * shows a "thinking" indicator while this promise is in flight.
 */
export async function completeGroqChat(params: CompletionParams): Promise<string> {
  const groq = getGroq();
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    stream: false,
    temperature: 0.2,
    max_tokens: 2048,
    messages: buildMessages(params),
    ...REASONING_EXTRAS,
  });
  return res.choices?.[0]?.message?.content ?? "";
}

/**
 * Kept for callers that still want SSE. Not currently used by /api/chat.
 */
export async function streamGroqChat(params: CompletionParams) {
  const groq = getGroq();
  return groq.chat.completions.create({
    model: GROQ_MODEL,
    stream: true,
    temperature: 0.2,
    max_tokens: 2048,
    messages: buildMessages(params),
    ...REASONING_EXTRAS,
  });
}
