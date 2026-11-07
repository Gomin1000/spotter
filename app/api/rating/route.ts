import type { LeetCodeDifficulty, Problem, RatingRequest, RatingResponse } from "@/lib/contract";
import { generateJson, ThinkingLevel } from "@/lib/gemini";

// Allow slow Gemini calls on Vercel (seconds).
export const maxDuration = 60;

type Confidence = RatingResponse["confidence"];

const MIN_RATING = 800;
const MAX_RATING = 3500;
const CF_TIMEOUT_MS = 8000;

// ---------- Official rating from Codeforces ----------

interface CfProblemRef {
  contestId: number;
  index: string;
}

/** Parse codeforces.com/problemset/problem/<id>/<idx> or /contest/<id>/problem/<idx>. */
function parseCodeforcesUrl(raw: string | undefined): CfProblemRef | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!/(^|\.)codeforces\.(com|ml|net)$/i.test(url.hostname)) return null;
  const m =
    url.pathname.match(/^\/problemset\/problem\/(\d+)\/([A-Za-z]\d*)\/?$/) ??
    url.pathname.match(/^\/contest\/(\d+)\/problem\/([A-Za-z]\d*)\/?$/);
  if (!m) return null;
  return { contestId: Number(m[1]), index: m[2].toUpperCase() };
}

interface CfProblemset {
  status: string;
  result?: { problems?: { contestId?: number; index: string; rating?: number }[] };
}

// contest.standings no longer accepts from/count for anonymous calls, and full
// standings can be 10+ MB. problemset.problems (~2 MB) has every rating, so fetch
// it once and keep a "<contestId><INDEX>" -> rating map in memory.
const PROBLEMSET_URL = "https://codeforces.com/api/problemset.problems";
const RATINGS_TTL_MS = 6 * 60 * 60 * 1000;
let ratings: { map: Map<string, number>; at: number } | null = null;
let ratingsLoading: Promise<Map<string, number> | null> | null = null;

async function loadRatings(): Promise<Map<string, number> | null> {
  const res = await fetch(PROBLEMSET_URL, { signal: AbortSignal.timeout(CF_TIMEOUT_MS), cache: "no-store" });
  if (!res.ok) {
    console.warn(`[rating] codeforces problemset ${res.status}`);
    return null;
  }
  const data = (await res.json()) as CfProblemset;
  if (data.status !== "OK" || !data.result?.problems) return null;
  const map = new Map<string, number>();
  for (const p of data.result.problems) {
    if (p.contestId && typeof p.rating === "number") map.set(`${p.contestId}${p.index.toUpperCase()}`, p.rating);
  }
  ratings = { map, at: Date.now() };
  return map;
}

async function getRatings(): Promise<Map<string, number> | null> {
  if (ratings && Date.now() - ratings.at < RATINGS_TTL_MS) return ratings.map;
  ratingsLoading ??= loadRatings()
    .catch((e) => {
      console.warn("[rating] codeforces lookup failed:", e);
      return null;
    })
    .finally(() => {
      ratingsLoading = null;
    });
  return (await ratingsLoading) ?? ratings?.map ?? null; // stale map beats none
}

async function fetchCodeforcesRating(ref: CfProblemRef): Promise<number | null> {
  const map = await getRatings();
  return map?.get(`${ref.contestId}${ref.index}`) ?? null;
}

// ---------- LeetCode ----------

const LC_DIFFICULTIES: readonly LeetCodeDifficulty[] = ["Easy", "Medium", "Hard"];

function isLeetCodeUrl(raw: string | undefined): boolean {
  if (!raw) return false;
  try {
    return /(^|\.)leetcode\.(com|cn)$/i.test(new URL(raw).hostname);
  } catch {
    return false;
  }
}

/** Official LeetCode difficulty if this is a LeetCode problem with a known label, else null. */
function leetCodeDifficulty(p: Problem): LeetCodeDifficulty | null {
  if (!isLeetCodeUrl(p.source_url)) return null;
  return LC_DIFFICULTIES.find((d) => d === p.difficulty) ?? null;
}

// ---------- Gemini estimate ----------

const SYSTEM = `You estimate the difficulty of a competitive-programming problem as a Codeforces-style rating (800 = easiest Div. 2 A, 3500 = hardest).
Rules:
- Base the estimate on the statement, constraints, and samples: what the intended solution likely needs (ad hoc, greedy, sorting, DP, graphs, data structures, math) and how tight the constraints are.
- rating: an integer from 800 to 3500, rounded to the nearest 100.
- confidence: be honest. "high" only if the difficulty is clear-cut (e.g. a textbook easy problem), "medium" if you have a reasonable idea, "low" if the statement is short, unclear, or could go several ways. Most estimates should be medium or low.
- Never reveal or describe the solution. Output only the fields in the schema.`;

const SCHEMA = {
  type: "object",
  properties: {
    rating: { type: "integer" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
  },
  required: ["rating", "confidence"],
};

interface ModelEstimate {
  rating: number;
  confidence: Confidence;
}

function buildPrompt(p: Problem): string {
  return [
    `PROBLEM: ${p.title}`,
    p.summary,
    p.constraints?.length ? `Constraints: ${p.constraints.join("; ")}` : "Constraints: none given",
    p.sample_input ? `Sample input:\n${p.sample_input.slice(0, 2000)}` : "",
    p.sample_output ? `Sample output:\n${p.sample_output.slice(0, 2000)}` : "",
    p.difficulty ? `Official LeetCode difficulty: ${p.difficulty} (use it to calibrate).` : "",
    "",
    "Estimate its Codeforces rating.",
  ]
    .filter(Boolean)
    .join("\n");
}

function clampRating(n: number): number {
  const r = Math.round(n / 100) * 100;
  return Math.min(MAX_RATING, Math.max(MIN_RATING, r));
}

// ---------- Mascot lines ----------

function mascotLine(rating: number, source: RatingResponse["source"]): string {
  // "an" for numbers read aloud starting with a vowel: 800, 1100 (eleven), 1800 (eighteen).
  const article = /^(8|11|18)\d\d$/.test(String(rating)) ? "an" : "a";
  const est = source === "estimate" ? `About ${article} ` : `That's ${article} `;
  if (rating < 1200) return `${est}${rating} lift. Warm-up weight, no excuses.`;
  if (rating < 1600) return `${est}${rating} lift. Respectable.`;
  if (rating < 2000) return `${est}${rating} lift. Now we're putting plates on.`;
  if (rating < 2500) return `${est}${rating} lift. Heavy. Brace your core.`;
  return `${est}${rating} lift. Max-out territory. I'm right here.`;
}

/** LeetCode difficulty without a Codeforces-style estimate (the estimate failed). */
function leetCodeOnly(difficulty: LeetCodeDifficulty): RatingResponse {
  const line: Record<LeetCodeDifficulty, string> = {
    Easy: "LeetCode Easy. Warm-up weight, no excuses.",
    Medium: "LeetCode Medium. Put some plates on.",
    Hard: "LeetCode Hard. Brace your core.",
  };
  return { ok: true, rating: null, source: "leetcode", difficulty, confidence: "low", mascot_line: line[difficulty] };
}

function fail(mascot_line: string): Response {
  const body: RatingResponse = { ok: false, rating: null, source: "estimate", confidence: "low", mascot_line };
  return Response.json(body);
}

export async function POST(request: Request): Promise<Response> {
  let req: RatingRequest;
  try {
    req = (await request.json()) as RatingRequest;
  } catch {
    return fail("Couldn't read that request. Try again.");
  }
  const p = req.problem;
  if (!p?.title) return fail("No problem loaded yet. Show me the problem first.");

  const cf = parseCodeforcesUrl(p.source_url);
  if (cf) {
    const rating = await fetchCodeforcesRating(cf);
    if (rating !== null) {
      const body: RatingResponse = {
        ok: true,
        rating,
        source: "codeforces",
        confidence: "high",
        mascot_line: mascotLine(rating, "codeforces"),
      };
      return Response.json(body);
    }
  }

  const lc = leetCodeDifficulty(p);

  try {
    const out = await generateJson<ModelEstimate>({
      label: "rating estimate",
      systemInstruction: SYSTEM,
      parts: [{ text: buildPrompt(p) }],
      schema: SCHEMA,
      thinkingLevel: ThinkingLevel.MEDIUM,
    });
    if (typeof out.rating !== "number" || !Number.isFinite(out.rating)) {
      return lc ? Response.json(leetCodeOnly(lc)) : fail("Couldn't size up that weight. Try again.");
    }
    const rating = clampRating(out.rating);
    const confidence: Confidence = ["high", "medium", "low"].includes(out.confidence) ? out.confidence : "low";
    const body: RatingResponse = lc
      ? {
          ok: true,
          rating,
          source: "leetcode",
          difficulty: lc,
          confidence,
          mascot_line: `LeetCode ${lc}. ${mascotLine(rating, "estimate")}`,
        }
      : {
          ok: true,
          rating,
          source: "estimate",
          confidence,
          mascot_line: mascotLine(rating, "estimate"),
        };
    return Response.json(body);
  } catch (e) {
    console.error("[rating] error:", e);
    // The official LeetCode label is still worth showing without the estimate.
    if (lc) return Response.json(leetCodeOnly(lc));
    return fail("Pulled a servo sizing that up. Try again in a sec.");
  }
}
