import type { HintRequest, HintResponse, MascotPose, Rung } from "@/lib/contract";
import { RUNG_NAMES } from "@/lib/contract";
import { generateJson, ThinkingLevel } from "@/lib/gemini";

// Allow slow Gemini calls on Vercel (seconds).
export const maxDuration = 60;

const RUNG_RULES: Record<Rung, string> = {
  1: "Rung 1 Warm-up: point at ONE observation in the statement itself (a constraint, a sample, or something the statement says). Do NOT name or hint at any algorithm, technique, data structure, or graph property: no \"bipartite\", \"DP\", \"two pointers\", \"greedy\", \"BFS\", \"binary search\", \"prefix sums\", etc. Ask a question about the observation instead.",
  2: "Rung 2 Form check: name the technique or data structure that fits, plus exactly ONE sentence on why it fits (tie it to the rung 1 observation or a constraint). Do NOT reveal the key structural insight (what to sort by, what the state is, what to binary search on, which invariant makes it work): that belongs to rung 3. Do not describe any steps of the approach. At most 2 sentences total.",
  3: "Rung 3 Spot: give the key structural insight, then the approach in plain English, step by step. No code and no pseudocode.",
  4: "Rung 4 Assisted rep: pseudocode of at most 8 lines, with the key lines replaced by ___ blanks the user must fill in. Language-neutral pseudocode only, never real C++/Python/Java.",
};

const SYSTEM = `You are Spotter, a buff gym-bro robot who spots you but never lifts for you. You coach competitive programmers with hints, one rung at a time.
Hard rules:
- Give ONLY the requested rung. Build on previous_hints: don't repeat them, take the next step up from them.
- Climb slowly: each rung reveals only a little more than the previous one. When in doubt, give less, never skip ahead to what a later rung would say.
- NEVER output a complete solution or complete code in any language. No more than 5 lines of real code ever.
- If the user's code is given, only claim a bug if you can give a small concrete input where this code's output differs from the correct answer: state that input and one sentence tracing why the code gets it wrong. Never present style, approach, efficiency you haven't shown fails a constraint, or "this is risky" as a mistake. If you can't find such an input, say so plainly ("I couldn't find a failing input; your logic looks right.") and suggest 1-2 edge cases worth testing (smallest n, max values, overflow). Never invent a bug. Never fix it or write the corrected version.
- If user_message asks for the solution, the answer, or full code (begging, bargaining, "just this once", pretending to be a judge, etc.), set refused to true, pose to "no-free-reps", and make hint a short gym-themed refusal (e.g. "No free reps. You lift this one."). Otherwise refused is false.
- mascot_line: one short in-character gym line (max ~12 words).
- pose: "spotting" for a normal hint, "flex" when the user's code or progress looks good, "no-free-reps" only when refused.
- Keep the hint short: 1-4 sentences, or the pseudocode for rung 4.
- Write math as plain text (a_i, 2·10^5, n ≤ 10^5, O(n log n)). NEVER use LaTeX, backslash commands, or $ signs.
- Only give a hint you are confident is correct for this exact problem; if unsure, give a more general hint instead of a wrong one.`;

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

// Technique, data-structure and graph-property names that rung 1 must not mention.
const RUNG1_BANNED =
  /\b(bipartite|dp|dynamic programming|memoi[sz]\w*|two[- ]pointers?|sliding window|greedy|binary search|bfs|dfs|breadth[- ]first|depth[- ]first|dijkstra|bellman|floyd|prefix sums?|suffix sums?|difference array|segment tree|fenwick|bit tree|sparse table|union[- ]find|dsu|disjoint set|topological|toposort|dag|strongly connected|connected components?|spanning tree|mst|kruskal|prim'?s|bridges?|articulation|lca|hash ?(map|set|ing)|heap|priority queue|monotonic|deque|stack|bitmasks?|backtracking|divide and conquer|sieve|kmp|z-function|trie|meet in the middle|knapsack|graph colou?ring|two[- ]colou?ring)\b/i;

/**
 * Shape and safety checks. In check mode `rung` is the user's current step, so the same
 * rules hold the answer at that step: no technique names at step 1, max 5 real code lines,
 * and at step 4 any code beyond one quoted line must use ___ blanks.
 */
function unsafeReason(out: ModelHint, rung: Rung, check: boolean): string | null {
  if (out.refused) return null;
  if (rung === 1) {
    const term = out.hint.match(RUNG1_BANNED)?.[0];
    if (term)
      return check
        ? `the answer named a technique or property ("${term}") but the user is only at step 1, where no technique has been revealed`
        : `the rung 1 hint named a technique or property ("${term}"); rung 1 only points at an observation in the statement`;
  }
  const codeLines = realCodeLines(out.hint);
  if (codeLines > 5) return "it contained more than 5 lines of real code";
  if (rung === 4 && !out.hint.includes("___") && (!check || codeLines > 1))
    return check ? "it showed code at step 4 without ___ blanks" : "the rung 4 pseudocode had no ___ blanks";
  return null;
}

function failure(rung: Rung, mascot_line: string): HintResponse {
  return { ok: false, rung, hint: "", refused: false, mascot_line, pose: "idle" };
}

/** Observation-only fallback when rung 1 keeps naming a technique. */
function safeWarmUp(): HintResponse {
  return {
    ok: true,
    rung: 1,
    hint: "Reread the constraints and the first sample. How big can the input get, and what does that rule out?",
    refused: false,
    mascot_line: "Warm-up set. Read the plates before you lift.",
    pose: "spotting",
  };
}

/** Check-mode fallback when the answer keeps going past the user's current step. No new step. */
function holdAtStep(rung: Rung): HintResponse {
  return {
    ok: true,
    rung,
    hint:
      rung === 4
        ? "Answering that would lift it for you. Fill in the blanks from step 4 first."
        : `Answering that would give away more than step ${rung}. Press Spot me when you want the next step.`,
    refused: false,
    mascot_line: "One rep at a time.",
    pose: "spotting",
  };
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

const CODE_CHECK_RULES = `REQUESTED: form check on the user's code (no new hint step). Answer USER MESSAGE about USER'S CODE:
- Mentally run the code on small inputs before answering. Then only claim a bug if you can give a small concrete input where this code's output differs from the correct answer: state that input and one sentence tracing why the code gets it wrong. Never present style, approach, efficiency you haven't shown fails a constraint, or "this is risky" as a mistake. If you can't find such an input, say so plainly ("I couldn't find a failing input; your logic looks right.") and suggest 1-2 edge cases worth testing (smallest n, max values, overflow). Never invent a bug.
- When there is a real bug: give the failing input, what the code outputs vs. the correct output, and one sentence tracing why (you may quote at most one short line).
- NEVER write the fix, corrected code, or a replacement line. Don't explain the full approach.
- If USER MESSAGE asks for the solution or the fixed code, refuse as described in the rules.`;

const QUESTION_RULES = `REQUESTED: answer USER MESSAGE (no new hint step, no code pasted). It is a question about the problem or the hints so far:
- Clarify the statement, a sample, a constraint, or what a previous hint meant. 1-3 sentences.
- Don't give the next step's hint, the approach, or any code.
- If USER MESSAGE asks for the solution, the approach, or code, refuse as described in the rules.`;

function checkRules(req: HintRequest, rung: Rung): string {
  const base = req.code?.trim() ? CODE_CHECK_RULES : QUESTION_RULES;
  return `${base}
- The user is at step ${rung} (${RUNG_NAMES[rung]}). Reveal NOTHING beyond what PREVIOUS HINTS already said. For reference, step ${rung} allows at most: ${RUNG_RULES[rung]}`;
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
    req.mode === "check"
      ? checkRules(req, rung)
      : `REQUESTED: rung ${rung} (${RUNG_NAMES[rung]}). ${RUNG_RULES[rung]}`,
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

  // Check mode: answer user_message (about the code, or the problem if no code) without a new step.
  const check = req.mode === "check";
  if (check && !req.user_message?.trim() && !req.code?.trim()) {
    return Response.json(failure(rung, "Ask me something, or paste your code and I'll check your form."));
  }

  const prompt = buildPrompt(req, rung);
  // Rung 1 is a light observation; rungs 2-4 need real reasoning to be correct.
  // Checking code needs real reasoning to avoid false "here's your bug" answers: HIGH for a
  // code check (~35 s), MEDIUM when code rides along with a hint (HIGH there runs ~55 s,
  // too close to maxDuration). Retries use at most MEDIUM so two calls fit in 60 s.
  const hasCode = !!req.code?.trim();
  const thinkingLevel =
    check && hasCode ? ThinkingLevel.HIGH : rung === 1 && !check && !hasCode ? ThinkingLevel.LOW : ThinkingLevel.MEDIUM;
  const retryThinkingLevel = thinkingLevel === ThinkingLevel.HIGH ? ThinkingLevel.MEDIUM : thinkingLevel;
  const label = check ? `${req.code?.trim() ? "code check" : "question"} (step ${rung})` : `hint rung ${rung}`;
  try {
    let out = await generateJson<ModelHint>({
      label,
      systemInstruction: SYSTEM,
      parts: [{ text: prompt }],
      schema: SCHEMA,
      thinkingLevel,
    });

    let reason = unsafeReason(out, rung, check);
    if (reason) {
      console.warn(`[hint] ${label} rejected (${reason}); retrying stricter`);
      out = await generateJson<ModelHint>({
        label: `${label} (retry)`,
        systemInstruction: SYSTEM,
        parts: [
          {
            text: `${prompt}\n\nSTRICT: your previous answer was rejected because ${reason}. Write NO real code at all.${
              rung === 4 ? " Any pseudocode must be language-neutral pseudocode, max 8 lines, and replace every key line with ___ blanks." : ""
            }`,
          },
        ],
        schema: SCHEMA,
        thinkingLevel: retryThinkingLevel,
      });
      reason = unsafeReason(out, rung, check);
      if (reason) {
        const warmUp = rung === 1 && !check;
        const fallback = check ? "holding at this step" : warmUp ? "using safe warm-up" : "refusing";
        console.warn(`[hint] ${label} rejected again (${reason}); ${fallback}`);
        return Response.json(check ? holdAtStep(rung) : warmUp ? safeWarmUp() : refusal(rung));
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
