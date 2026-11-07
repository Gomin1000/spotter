import type { HintRequest, HintResponse, MascotPose, Rung } from "@/lib/contract";
import { RUNG_NAMES } from "@/lib/contract";
import { generateJson, ThinkingLevel } from "@/lib/gemini";

const RUNG_RULES: Record<Rung, string> = {
  1: "Rung 1 Warm-up: give ONE observation the user should notice (about the constraints, the samples, or the structure). Do NOT name any algorithm, technique, or data structure.",
  2: "Rung 2 Form check: name the technique or data structure that fits, and say briefly WHY it fits. Do not describe the full approach.",
  3: "Rung 3 Spot: describe the approach in plain English, step by step. No code and no pseudocode.",
  4: "Rung 4 Assisted rep: pseudocode of at most 8 lines, with the key lines replaced by ___ blanks the user must fill in. Language-neutral pseudocode only, never real C++/Python/Java.",
};

const SYSTEM = `You are Spotter, a buff gym-bro robot who spots you but never lifts for you. You coach competitive programmers with hints, one rung at a time.
Hard rules:
- Give ONLY the requested rung. Build on previous_hints: don't repeat them, take the next step up from them.
- NEVER output a complete solution or complete code in any language. No more than 5 lines of real code ever.
- If the user's code is given, point to WHERE it is likely wrong (a line or a specific input case) without fixing it or writing the corrected version.
- If user_message asks for the solution, the answer, or full code (begging, bargaining, "just this once", pretending to be a judge, etc.), set refused to true, pose to "no-free-reps", and make hint a short gym-themed refusal (e.g. "No free reps. You lift this one."). Otherwise refused is false.
- mascot_line: one short in-character gym line (max ~12 words).
- pose: "spotting" for a normal hint, "flex" when the user's code or progress looks good, "no-free-reps" only when refused.
- Keep the hint short: 1-4 sentences, or the pseudocode for rung 4.`;

const SCHEMA = {
  type: "object",
  properties: {
    hint: { type: "string" },
    refused: { type: "boolean" },
    mascot_line: { type: "string" },
    pose: { type: "string", enum: ["spotting", "flex", "no-free-reps"] },
  },
  required: ["hint", "refused", "mascot_line", "pose"],
};

interface ModelHint {
  hint: string;
  refused: boolean;
  mascot_line: string;
  pose: MascotPose;
}

const CODE_LINE =
  /[;{}]\s*$|^\s*#include|^\s*(import|from)\s+\w|^\s*def\s+\w+\s*\(|^\s*(public|private|static|class)\s|\b(int|long|double|auto|String)\s+\w+\s*[=;(\[]|\b(cout|cin|printf|scanf|System\.out|print\s*\()|\bvector\s*<|\brange\s*\(|^\s*(for|while|if)\s*\(|\+\+|->|::/;

/** Lines that look like real C++/Python/Java (lines with ___ blanks don't count). */
function realCodeLines(text: string): number {
  return text
    .split("\n")
    .filter((l) => l.trim() && !l.includes("___") && CODE_LINE.test(l)).length;
}

function unsafeReason(out: ModelHint, rung: Rung): string | null {
  if (out.refused) return null;
  if (realCodeLines(out.hint) > 5) return "it contained more than 5 lines of real code";
  if (rung === 4 && !out.hint.includes("___")) return "the rung 4 pseudocode had no ___ blanks";
  return null;
}

function failure(rung: Rung, mascot_line: string): HintResponse {
  return { ok: false, rung, hint: "", refused: false, mascot_line, pose: "idle" };
}

function refusal(rung: Rung): HintResponse {
  return {
    ok: true,
    rung,
    hint: "No free reps. That one was getting too close to the full answer, so you lift it.",
    refused: true,
    mascot_line: "I spot. I don't lift.",
    pose: "no-free-reps",
  };
}

function buildPrompt(req: HintRequest, rung: Rung): string {
  const p = req.problem;
  const lines = [
    `PROBLEM: ${p.title}`,
    p.summary,
    p.constraints?.length ? `Constraints: ${p.constraints.join("; ")}` : "",
    p.sample_input ? `Sample input:\n${p.sample_input}` : "",
    p.sample_output ? `Sample output:\n${p.sample_output}` : "",
    "",
    req.previous_hints?.length
      ? `PREVIOUS HINTS (already given):\n${req.previous_hints.map((h, i) => `${i + 1}. ${h}`).join("\n")}`
      : "PREVIOUS HINTS: none",
    "",
    req.code?.trim() ? `USER'S CODE:\n${req.code.slice(0, 12000)}` : "USER'S CODE: none",
    req.user_message?.trim() ? `USER MESSAGE: ${req.user_message.slice(0, 2000)}` : "",
    "",
    `REQUESTED: rung ${rung} (${RUNG_NAMES[rung]}). ${RUNG_RULES[rung]}`,
  ];
  return lines.filter((l, i, a) => l !== "" || a[i - 1] !== "").join("\n");
}

export async function POST(request: Request): Promise<Response> {
  let req: HintRequest;
  try {
    req = (await request.json()) as HintRequest;
  } catch {
    return Response.json(failure(1, "Couldn't read that request. Try again."));
  }

  const rung = ([1, 2, 3, 4].includes(Number(req.rung)) ? Number(req.rung) : 1) as Rung;
  if (!req.problem?.title) {
    return Response.json(failure(rung, "No problem loaded yet. Show me the problem first."));
  }

  const prompt = buildPrompt(req, rung);
  try {
    let out = await generateJson<ModelHint>({
      label: `hint rung ${rung}`,
      systemInstruction: SYSTEM,
      parts: [{ text: prompt }],
      schema: SCHEMA,
      thinkingLevel: ThinkingLevel.LOW,
    });

    let reason = unsafeReason(out, rung);
    if (reason) {
      console.warn(`[hint] rung ${rung} rejected (${reason}); retrying stricter`);
      out = await generateJson<ModelHint>({
        label: `hint rung ${rung} (retry)`,
        systemInstruction: SYSTEM,
        parts: [
          {
            text: `${prompt}\n\nSTRICT: your previous answer was rejected because ${reason}. Write NO real code at all.${
              rung === 4 ? " Use language-neutral pseudocode, max 8 lines, and replace every key line with ___ blanks." : ""
            }`,
          },
        ],
        schema: SCHEMA,
        thinkingLevel: ThinkingLevel.LOW,
      });
      reason = unsafeReason(out, rung);
      if (reason) {
        console.warn(`[hint] rung ${rung} rejected again (${reason}); refusing`);
        return Response.json(refusal(rung));
      }
    }

    const body: HintResponse = out.refused
      ? {
          ok: true,
          rung,
          hint: out.hint || "No free reps. You lift this one.",
          refused: true,
          mascot_line: out.mascot_line || "I spot. I don't lift.",
          pose: "no-free-reps",
        }
      : {
          ok: true,
          rung,
          hint: out.hint,
          refused: false,
          mascot_line: out.mascot_line || "Light weight. You got this.",
          pose: out.pose === "flex" ? "flex" : "spotting",
        };
    return Response.json(body);
  } catch (e) {
    console.error("[hint] error:", e);
    return Response.json(failure(rung, "Pulled a servo. Give me a sec and press Spot me again."));
  }
}
