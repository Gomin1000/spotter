"use client";

import Link from "next/link";
import { useState } from "react";
import {
  getHint,
  readProblem,
  type MascotPose,
  type Problem,
  type ReadProblemRequest,
  type Rung,
} from "@/lib/api";
import { grabScreenOnce } from "@/lib/image";
import { useExtensionBridge } from "@/lib/useExtensionBridge";
import { usePasteImage } from "@/lib/usePasteImage";
import { useScreenWatcher } from "@/lib/useScreenWatcher";
import { Barbell } from "@/components/Barbell";
import { HintLadder, type GivenHint } from "@/components/HintLadder";
import { Mascot } from "@/components/Mascot";
import { ProblemCard } from "@/components/ProblemCard";
import { SessionCard } from "@/components/SessionCard";
import { ERROR_LINES, SOLVED_LINES } from "@/components/voice";

const HELLO = "Spotter here. I spot you. I don't lift for you.";

export default function Home() {
  const [problem, setProblem] = useState<Problem | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [hints, setHints] = useState<GivenHint[]>([]);
  const [hintBusy, setHintBusy] = useState(false);
  const [code, setCode] = useState("");
  const [refused, setRefused] = useState(false);
  const [line, setLine] = useState(HELLO);
  const [lastFromHint, setLastFromHint] = useState(false);
  const [solvedWith, setSolvedWith] = useState<number | null>(null);

  const watcher = useScreenWatcher({ problemTitle: problem?.title });

  // When watch mode says something new, it takes over the speech bubble.
  const [seenWatchLine, setSeenWatchLine] = useState(watcher.mascotLine);
  if (watcher.mascotLine !== seenWatchLine) {
    setSeenWatchLine(watcher.mascotLine);
    if (watcher.mascotLine) {
      setLine(watcher.mascotLine);
      setRefused(false);
      setLastFromHint(false);
    }
  }

  function say(text: string, fromHint = false) {
    setLine(text);
    setLastFromHint(fromHint);
  }

  // ---------- Reading the problem ----------

  function loadProblem(p: Problem, from: string | null, message: string) {
    setProblem(p);
    setLoadedFrom(from);
    setHints([]);
    setRefused(false);
    setSolvedWith(null);
    say(message || `Got it: "${p.title}". Press Spot me when you need a hand.`);
  }

  async function read(req: ReadProblemRequest) {
    setReading(true);
    say("Let me take a look…");
    try {
      const res = await readProblem(req);
      if (res.found_problem && res.problem) loadProblem(res.problem, null, res.message);
      else say(res.message || ERROR_LINES.notFound);
    } catch {
      say(ERROR_LINES.read);
    } finally {
      setReading(false);
    }
  }

  function readScreen() {
    // grabScreenOnce() must be called synchronously in the click handler (Firefox).
    const grab = grabScreenOnce();
    setReading(true);
    void grab
      .then((res) => {
        if (res.ok) return read({ image_base64: res.image_base64 });
        setReading(false);
        say(res.message);
      })
      .catch(() => {
        setReading(false);
        say(ERROR_LINES.read);
      });
  }

  usePasteImage(
    (image_base64) => void read({ image_base64 }),
    (message) => say(message),
  );

  useExtensionBridge({
    onStart: () => {
      setReading(true);
      say("Reading that page…");
    },
    onResult: (res, page) => {
      setReading(false);
      if (res.found_problem && res.problem) loadProblem(res.problem, page.title || page.url || null, res.message);
      else say(res.message || ERROR_LINES.notFound);
    },
    onError: (message) => {
      setReading(false);
      say(message);
    },
  });

  // ---------- Hints ----------

  // Code-check answers live in the log too, but only real steps load plates.
  const steps = hints.filter((h) => h.kind === "step");
  const done = steps.length >= 4;
  const nextRung = Math.min(steps.length + 1, 4) as Rung;
  const currentRung = Math.max(steps.length, 1) as Rung;

  /** Asks for the next rung. Returns true if the request went through. */
  async function requestHint(user_message?: string): Promise<boolean> {
    if (!problem || hintBusy) return false;
    if (done && !user_message) return false;
    setHintBusy(true);
    setRefused(false);
    setSolvedWith(null);
    try {
      const res = await getHint({
        problem,
        rung: nextRung,
        previous_hints: steps.map((h) => h.text),
        code: code.trim() || undefined,
        user_message,
      });
      if (res.refused) {
        // A refusal doesn't use up a rung.
        setRefused(true);
        say(res.mascot_line || "No free reps.");
      } else if (res.ok && res.hint) {
        setHints((h) => [...h, { kind: "step", rung: nextRung, text: res.hint }]);
        say(res.mascot_line || "There's your spot. Now lift.", true);
      } else {
        say(res.mascot_line || ERROR_LINES.hint);
      }
      return true;
    } catch {
      say(ERROR_LINES.hint);
      return false;
    } finally {
      setHintBusy(false);
    }
  }

  /**
   * Talk to Spotter. With code pasted (or after step 4) it asks a question about the code in
   * "check" mode: the answer joins the log but never unlocks a step. Otherwise it asks for the
   * next step with the message attached. Returns true if the request went through.
   */
  async function talk(user_message: string): Promise<boolean> {
    const trimmedCode = code.trim();
    if (!trimmedCode && !done) return requestHint(user_message);
    if (!problem || hintBusy) return false;
    setHintBusy(true);
    setRefused(false);
    setSolvedWith(null);
    try {
      const res = await getHint({
        problem,
        mode: "check",
        rung: currentRung,
        previous_hints: steps.map((h) => h.text),
        code: trimmedCode || undefined,
        user_message,
      });
      if (res.refused) {
        setRefused(true);
        say(res.mascot_line || "No free reps.");
      } else if (res.ok && res.hint) {
        setHints((h) => [...h, { kind: "check", rung: currentRung, text: res.hint, question: user_message }]);
        say(res.mascot_line || "Look closer. It's in there.", true);
      } else {
        say(res.mascot_line || ERROR_LINES.hint);
      }
      return true;
    } catch {
      say(ERROR_LINES.hint);
      return false;
    } finally {
      setHintBusy(false);
    }
  }

  function markSolved() {
    const n = steps.length;
    setSolvedWith(n);
    setRefused(false);
    const cheer = SOLVED_LINES[Math.floor(Math.random() * SOLVED_LINES.length)];
    say(`${cheer} ${n === 0 ? "No spots needed." : `Solved with ${n} spot${n === 1 ? "" : "s"}.`}`);
  }

  // ---------- Pose ----------
  // no-free-reps after a refusal > side-eye when distracted > flex when solved
  // > spotting while hinting or stuck > idle

  const watchingStatus = watcher.isWatching ? watcher.status : null;
  let pose: MascotPose = "idle";
  if (refused) pose = "no-free-reps";
  else if (watchingStatus === "distracted") pose = "side-eye";
  else if (solvedWith != null) pose = "flex";
  else if (hintBusy || watchingStatus === "stuck" || lastFromHint) pose = "spotting";

  return (
    <div className="min-h-screen w-full bg-rubber text-chalk">
      <main className="mx-auto flex w-full max-w-[400px] flex-col px-4 pb-12">
        <header className="flex items-baseline justify-between pt-4">
          <h1 className="font-display text-2xl font-bold">Spotter</h1>
          <Link href="/install" className="text-sm text-dust underline-offset-4 hover:text-chalk hover:underline">
            Get the Chrome extension
          </Link>
        </header>

        {/* Pinned so side-eye, refusals and the loaded bar stay visible while scrolled down to the log. */}
        <div className="sticky top-0 z-20 -mx-4 flex flex-col gap-2 border-b border-dust/20 bg-rubber px-4 pb-3 pt-3">
          <Mascot pose={pose} line={line} />
          <Barbell loaded={steps.length} />
        </div>

        <div className="flex flex-col gap-10 pt-7">
          <ProblemCard
            problem={problem}
            loadedFrom={loadedFrom}
            reading={reading}
            onReadText={(text) => void read({ text })}
            onReadScreen={readScreen}
            onLine={(l) => say(l)}
          />

          <HintLadder
            hints={hints}
            hasProblem={!!problem}
            busy={hintBusy}
            code={code}
            onCodeChange={setCode}
            onSpotMe={() => void requestHint()}
            onTalk={talk}
            solvedWith={solvedWith}
            onSolved={markSolved}
          />

          <SessionCard watcher={watcher} canSpot={!!problem && !done && !hintBusy} onAcceptSpot={() => void requestHint()} />
        </div>
      </main>
    </div>
  );
}
