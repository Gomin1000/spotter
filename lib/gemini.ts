// Server-only Gemini helper. Never import from client components.
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";

export const MODEL = "gemini-3.8-flash";

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

export interface GenerateJsonOptions {
  label: string;
  systemInstruction: string;
  parts: Part[];
  schema: object;
  thinkingLevel?: ThinkingLevel;
}

/** Call Gemini with a JSON response schema, log timing, and parse the result. */
export async function generateJson<T>(opts: GenerateJsonOptions): Promise<T> {
  const t0 = Date.now();
  try {
    const res = await getClient().models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: opts.parts }],
      config: {
        systemInstruction: opts.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: opts.schema,
        thinkingConfig: { thinkingLevel: opts.thinkingLevel ?? ThinkingLevel.LOW },
      },
    });
    const text = res.text;
    if (!text) throw new Error("Empty response from Gemini");
    return JSON.parse(text) as T;
  } finally {
    console.log(`[gemini] ${opts.label} took ${Date.now() - t0} ms`);
  }
}

export { ThinkingLevel };
