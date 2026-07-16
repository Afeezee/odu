/**
 * Groq client + shared chat-completion helper.
 *
 * Model: llama-3.3-70b-versatile (Groq's current production Llama 3.3 model
 * as of late 2025 / 2026). If Groq deprecates the ID, check
 * https://console.groq.com/docs/models and swap GROQ_MODEL below.
 */
import Groq from "groq-sdk";

if (!process.env.GROQ_API_KEY) {
  // Don't throw at import time — server routes should fail with a clean 500
  // message instead of crashing the whole build. We check per-request.
}

export const GROQ_MODEL = "llama-3.3-70b-versatile";

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

export async function streamGroqChat(params: {
  systemPrompt: string;
  history: ChatTurn[];
  userMessage: string;
}) {
  const groq = getGroq();
  return groq.chat.completions.create({
    model: GROQ_MODEL,
    stream: true,
    temperature: 0.2,
    max_tokens: 1024,
    messages: [
      { role: "system", content: params.systemPrompt },
      ...params.history.map((t) => ({ role: t.role, content: t.content })),
      { role: "user", content: params.userMessage },
    ],
  });
}
