import type { Part } from "@google/genai";
import type { MascotPose, WatchRequest, WatchResponse, WatchStatus } from "@/lib/contract";
import { generateJson, ThinkingLevel } from "@/lib/gemini";

// Allow slow Gemini calls on Vercel (seconds).
export const maxDuration = 60;

const SYSTEM = `You are Spotter, a buff gym-bro robot coach watching a competitive programmer's screen through periodic screenshots. Classify what the user is doing in the NEWEST frame (the last image), using the earlier frame only for comparison.
Spotter itself is NEVER a distraction: ignore Spotter's own UI (a narrow side panel, usually on the right, with the Spotter robot mascot, hints or "Spot me" buttons, or a Spotter page in the browser) and judge only the rest of the screen. If Spotter's UI is the only thing visible, the status is focused.
Statuses:
- focused: a coding problem, code editor, terminal, or online-judge page is visible. Use focused even if nothing changed between the frames: thinking time is normal, and the app decides on its own when the user is stuck.
- distracted: video sites, social media, chat apps, games, shopping, news, or any other content unrelated to the problem.
- idle: lock screen, screensaver, or a blank desktop with nothing happening.
- unknown: you can't tell (black frame, unreadable, ambiguous).
Output rules:
- changed: compare the two frames. true if there is meaningful progress: code edited, the page scrolled, a new page or tab, new test or judge output, a new submission. false if the same content is just sitting there (a blinking cursor, a ticking clock, or a moved mouse don't count). With only one frame, changed is true.
- reason: ONE short generic sentence about what kind of content is visible (e.g. "A video site is open instead of the editor."). NEVER mention names, usernames, message contents, email addresses, video titles, or any personal info seen on screen.
- mascot_line: one short in-character gym-bro line (max ~12 words). distracted: a playful side-eye roast to get back to the bench. focused: encouragement. idle/unknown: a light check-in. Keep it generic like reason: NEVER mention names, usernames, message contents, email addresses, video titles, or anything specific seen on screen (say "videos", not what the video is about).
- pose: "side-eye" for distracted, "flex" or "idle" for focused, "idle" for idle or unknown.
- Never claim to see a problem or code that isn't actually on screen.`;

// The model never says "stuck": useScreenWatcher decides that from time without progress.
const STATUSES: WatchStatus[] = ["focused", "distracted", "idle", "unknown"];

const SCHEMA = {
  type: "object",
  properties: {
    status: { type: "string", enum: STATUSES },
    changed: { type: "boolean" },
    reason: { type: "string" },
    mascot_line: { type: "string" },
    pose: { type: "string", enum: ["idle", "spotting", "side-eye", "flex"] },
  },
  required: ["status", "changed", "reason", "mascot_line", "pose"],
};

interface ModelWatch {
  status: WatchStatus;
  changed: boolean;
  reason: string;
  mascot_line: string;
  pose: MascotPose;
}

const DEFAULT_LINES: Record<WatchStatus, string> = {
  focused: "Good form. Keep repping.",
  stuck: "Same weight for a while. Want a spot?",
  distracted: "That's not the problem. Back to the bench.",
  idle: "Still with me? The bar's waiting.",
  unknown: "Can't see the gym floor. Keep going.",
};

/** Keep pose consistent with status no matter what the model returns. */
function poseFor(status: WatchStatus, modelPose: MascotPose): MascotPose {
  if (status === "distracted") return "side-eye";
  if (status === "stuck") return "spotting";
  if (status === "focused") return modelPose === "flex" ? "flex" : "idle";
  return "idle";
}

function fail(reason: string, mascot_line = "Lost sight of you for a sec. Keep lifting."): Response {
  const body: WatchResponse = { ok: false, status: "unknown", changed: false, reason, mascot_line, pose: "idle" };
  return Response.json(body);
}

export async function POST(request: Request): Promise<Response> {
  let req: WatchRequest;
  try {
    req = (await request.json()) as WatchRequest;
  } catch {
    return fail("Couldn't read that request.");
  }

  const frames = Array.isArray(req.frames_base64)
    ? req.frames_base64.filter((f) => typeof f === "string" && f.length > 0).slice(-2)
    : [];
  if (frames.length === 0) return fail("No screen frames were sent.");

  const parts: Part[] = [];
  frames.forEach((data, i) => {
    const label = frames.length === 1 ? "Only frame (newest):" : i === 0 ? "Earlier frame:" : "Newest frame:";
    parts.push({ text: label });
    parts.push({ inlineData: { mimeType: "image/jpeg", data } });
  });
  const title = req.problem_title?.trim().slice(0, 200);
  parts.push({
    text: `${title ? `The user is working on the problem "${title}".` : "No problem is loaded yet."} ${
      frames.length === 1 ? "Only one frame, so changed is true." : "Compare the two frames for changed."
    } Classify the newest frame.`.trim(),
  });

  try {
    const out = await generateJson<ModelWatch>({
      label: `watch (${frames.length} frame${frames.length === 1 ? "" : "s"})`,
      systemInstruction: SYSTEM,
      parts,
      schema: SCHEMA,
      thinkingLevel: ThinkingLevel.LOW, // lowest level gemini-3.8-flash accepts (MINIMAL -> 400)
    });
    const status: WatchStatus = STATUSES.includes(out.status) ? out.status : "unknown";
    const body: WatchResponse = {
      ok: true,
      status,
      changed: frames.length < 2 || out.changed !== false,
      reason: out.reason || "Checked your screen.",
      mascot_line: out.mascot_line || DEFAULT_LINES[status],
      pose: poseFor(status, out.pose),
    };
    return Response.json(body);
  } catch (e) {
    console.error("[watch] error:", e);
    return fail("Couldn't check the screen right now.");
  }
}
