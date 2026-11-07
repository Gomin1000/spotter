import type { Part } from "@google/genai";
import type { Problem, ReadProblemRequest, ReadProblemResponse } from "@/lib/contract";
import { generateJson, ThinkingLevel } from "@/lib/gemini";

const SYSTEM = `You extract competitive-programming problems from a screenshot or pasted text.
Rules:
- Only report a problem that is actually visible in the input. Never invent, guess, or "complete" a problem from memory.
- If no competitive-programming problem is visible (e.g. a video, a blank editor, a random web page), set found_problem to false, problem to null, and write a short, friendly message telling the user to open the problem statement.
- If found: title (as shown, or a short descriptive one if none), summary (2-4 plain sentences of what to compute, faithful to the statement), constraints (each as shown, e.g. "1 ≤ n ≤ 2·10^5"; empty list if none visible), sample_input and sample_output (exact text of the first sample; empty string if none visible).
- message: one short friendly line confirming what you read.`;

const SCHEMA = {
  type: "object",
  properties: {
    found_problem: { type: "boolean" },
    problem: {
      type: ["object", "null"],
      properties: {
        title: { type: "string" },
        summary: { type: "string" },
        constraints: { type: "array", items: { type: "string" } },
        sample_input: { type: "string" },
        sample_output: { type: "string" },
      },
      required: ["title", "summary", "constraints", "sample_input", "sample_output"],
    },
    message: { type: "string" },
  },
  required: ["found_problem", "problem", "message"],
};

function fail(message: string): Response {
  const body: ReadProblemResponse = { found_problem: false, problem: null, message };
  return Response.json(body);
}

export async function POST(request: Request): Promise<Response> {
  let req: ReadProblemRequest;
  try {
    req = (await request.json()) as ReadProblemRequest;
  } catch {
    return fail("I couldn't read that request. Try again.");
  }

  const parts: Part[] = [];
  if (req.image_base64) {
    parts.push({ inlineData: { mimeType: "image/jpeg", data: req.image_base64 } });
    parts.push({ text: "Read the competitive-programming problem in this screenshot." });
  } else if (req.text?.trim()) {
    parts.push({ text: `Read the competitive-programming problem in this text:\n\n${req.text.slice(0, 20000)}` });
  } else {
    return fail("Send me a screenshot or paste the problem text first.");
  }

  try {
    const out = await generateJson<ReadProblemResponse>({
      label: "read-problem",
      systemInstruction: SYSTEM,
      parts,
      schema: SCHEMA,
      thinkingLevel: ThinkingLevel.LOW, // lowest level gemini-3.8-flash accepts (MINIMAL -> 400)
    });
    const p = out.problem as Partial<Problem> | null;
    if (!out.found_problem || !p || !p.title || !p.summary) {
      return fail(out.message || "I don't see a competitive-programming problem there. Open the statement and try again.");
    }
    const problem: Problem = {
      title: String(p.title),
      summary: String(p.summary),
      constraints: Array.isArray(p.constraints) ? p.constraints.map(String) : [],
      sample_input: String(p.sample_input ?? ""),
      sample_output: String(p.sample_output ?? ""),
    };
    const body: ReadProblemResponse = {
      found_problem: true,
      problem,
      message: out.message || `Got it: "${problem.title}".`,
    };
    return Response.json(body);
  } catch (e) {
    console.error("[read-problem] error:", e);
    return fail("My eyes are fogged up right now. Try again in a sec.");
  }
}
