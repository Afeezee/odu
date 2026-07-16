export async function readJsonResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(`HTTP ${res.status}: empty response body`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const preview = text.slice(0, 180).replace(/\s+/g, " ").trim();
    throw new Error(preview ? `HTTP ${res.status}: ${preview}` : `HTTP ${res.status}: invalid JSON response`);
  }
}