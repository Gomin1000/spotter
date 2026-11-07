// Shared request/response types for Spotter. Owner: Gleb (@Gomin1000).
// Post on the board before changing anything in this file.

export type MascotPose = "idle" | "spotting" | "side-eye" | "flex" | "no-free-reps";

// ---------- Read problem ----------

export interface Problem {
  title: string;
  summary: string;
  constraints: string[];
  sample_input: string;
  sample_output: string;
}

/** Send exactly one of image_base64 (JPEG, max 768 px wide, no data: prefix) or text. */
export interface ReadProblemRequest {
  image_base64?: string;
  text?: string;
}

export interface ReadProblemResponse {
  found_problem: boolean;
  problem: Problem | null;
  message: string;
}

// ---------- Hint ladder ----------

export type Rung = 1 | 2 | 3 | 4;

export const RUNG_NAMES: Record<Rung, string> = {
  1: "Warm-up",
  2: "Form check",
  3: "Spot",
  4: "Assisted rep",
};

export interface HintRequest {
  problem: Problem;
  rung: Rung;
  previous_hints: string[];
  code?: string;
  user_message?: string;
}

export interface HintResponse {
  ok: boolean;
  rung: Rung;
  hint: string;
  refused: boolean;
  mascot_line: string;
  pose: MascotPose;
}

// ---------- Watch mode ----------

export type WatchStatus = "focused" | "stuck" | "distracted" | "idle" | "unknown";

export interface WatchRequest {
  /** 1 or 2 JPEG frames (base64, no data: prefix), newest last. */
  frames_base64: string[];
  problem_title?: string;
}

export interface WatchResponse {
  ok: boolean;
  status: WatchStatus;
  reason: string;
  mascot_line: string;
  pose: MascotPose;
}

// ---------- Mocks ----------

export const MOCK_PROBLEM: Problem = {
  title: "Two Sum Closest",
  summary:
    "Given an array of n integers and a target T, find two different indices whose values sum as close to T as possible. Print that closest sum.",
  constraints: ["2 ≤ n ≤ 2·10^5", "-10^9 ≤ a_i ≤ 10^9", "-2·10^9 ≤ T ≤ 2·10^9"],
  sample_input: "5 10\n1 4 6 9 13",
  sample_output: "10",
};

export const MOCK_READ_PROBLEM_RESPONSE: ReadProblemResponse = {
  found_problem: true,
  problem: MOCK_PROBLEM,
  message: "Got it: \"Two Sum Closest\". Press Spot me when you need a hand.",
};

export const MOCK_HINT_RESPONSE: HintResponse = {
  ok: true,
  rung: 1,
  hint: "n is up to 2·10^5, so checking every pair is too slow. What would change if the array were sorted?",
  refused: false,
  mascot_line: "Light weight. Look at the constraints first.",
  pose: "spotting",
};

export const MOCK_WATCH_RESPONSE: WatchResponse = {
  ok: true,
  status: "distracted",
  reason: "The newest frame shows a YouTube video instead of the editor or problem page.",
  mascot_line: "That's not the problem. Back to the bench.",
  pose: "side-eye",
};
