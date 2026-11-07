"use client";
import { useState } from "react";
import { RUNG_NAMES, type Rung } from "@/lib/api";
import { LoadingLine } from "./LoadingLine";
import { PLATE, btnOutline, input, label } from "./ui";

/** One entry in the training log: an unlocked step, or an answer about the user's code. */
export type GivenHint =
  | { kind: "step"; rung: Rung; text: string }
  | { kind: "check"; rung: Rung; text: string; question: string };

interface Props {
  hints: GivenHint[];
  hasProblem: boolean;
  busy: boolean;
  code: string;
  onCodeChange: (code: string) => void;
  onSpotMe: () => void;
  /** Sends a message with the next hint request. Returns true if it was sent. */
  onTalk: (message: string) => Promise<boolean>;
  /** Hints used when the user marked it solved, or null if not solved yet. */
  solvedWith: number | null;
  onSolved: () => void;
}

export function HintLadder({ hints, hasProblem, busy, code, onCodeChange, onSpotMe, onTalk, solvedWith, onSolved }: Props) {
  const [message, setMessage] = useState("");
  const steps = hints.filter((h) => h.kind === "step").length;
  const done = steps >= 4;
  const next = Math.min(steps + 1, 4) as Rung;
  const checking = !!code.trim() || done;

  async function send() {
    const m = message.trim();
    if (!m) return;
    if (await onTalk(m)) setMessage("");
  }

  return (
    <section className="flex flex-col gap-8">
      {hasProblem && (hints.length > 0 || solvedWith != null) && (
        <div className="flex flex-col gap-7">
          {hints.length > 0 && (
            <ol className="flex flex-col gap-7" aria-label="Training log">
              {hints.map((h, i) => (
                h.kind === "check" ? <CheckEntry key={i} question={h.question} text={h.text} /> : <LogEntry key={i} hint={h} />
              ))}
            </ol>
          )}
          <Solved solvedWith={solvedWith} busy={busy} onSolved={onSolved} />
        </div>
      )}

      <div className="flex flex-col gap-2">
        {done ? (
          <p className="py-2 font-display text-2xl font-semibold leading-tight">That&apos;s every step. You&apos;ve got this.</p>
        ) : (
          <button
            className="flex w-full flex-col items-center rounded-ui bg-chalk px-4 py-3 text-rubber transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!hasProblem || busy}
            onClick={onSpotMe}
          >
            <span className="font-display text-2xl font-bold leading-none">Spot me</span>
            <span className="mt-1 text-[13px]">
              {hasProblem ? `Next: ${RUNG_NAMES[next]}` : "Load a problem first"}
            </span>
          </button>
        )}
        {busy && <LoadingLine />}
        {hasProblem && hints.length === 0 && solvedWith == null && (
          <Solved solvedWith={solvedWith} busy={busy} onSolved={onSolved} />
        )}
      </div>

      <div className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className={label}>
            Paste your code{code.trim() && <span className="text-dust/70"> ({code.split("\n").length} lines)</span>}
          </span>
          <textarea
            className={`${input} h-28 resize-y font-mono text-xs leading-relaxed`}
            placeholder="Optional. I'll read your attempt when I spot you."
            value={code}
            spellCheck={false}
            onChange={(e) => onCodeChange(e.target.value)}
          />
        </label>

        <form
          className="flex flex-col gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="talk" className={label}>
            Talk to Spotter
          </label>
          <div className="flex gap-2">
            <input
              id="talk"
              className={input}
              placeholder={!hasProblem ? "Load a problem first" : checking ? "Ask about your code" : "Ask about the problem"}
              value={message}
              disabled={!hasProblem}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className={btnOutline} type="submit" disabled={!hasProblem || busy || !message.trim()}>
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

/** A reply about the user's code: an empty ring instead of a plate, since no step was unlocked. */
function CheckEntry({ question, text }: { question: string; text: string }) {
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-3">
      <span aria-hidden className="mt-0.5 h-7 w-7 rounded-full border-2 border-dust/50" />
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold leading-7">Code check</h3>
        <p className="mt-0.5 text-sm text-dust">You asked: {question}</p>
        <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{text}</p>
      </div>
    </li>
  );
}

function LogEntry({ hint }: { hint: GivenHint }) {
  const plate = PLATE[hint.rung];
  return (
    <li className="grid grid-cols-[28px_1fr] gap-x-3">
      <span
        aria-hidden
        className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-display text-base font-bold ${plate.bg} ${plate.text}`}
      >
        {hint.rung}
      </span>
      <div className="min-w-0">
        <h3 className="font-display text-xl font-semibold leading-7">
          <span className="sr-only">Step {hint.rung}: </span>
          {RUNG_NAMES[hint.rung]}
        </h3>
        {hint.rung === 4 ? (
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-ui bg-mat p-3 font-mono text-xs leading-relaxed">
            {hint.text}
          </pre>
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">{hint.text}</p>
        )}
      </div>
    </li>
  );
}

function Solved({ solvedWith, busy, onSolved }: { solvedWith: number | null; busy: boolean; onSolved: () => void }) {
  if (solvedWith != null) {
    return (
      <p className="font-display text-xl font-semibold">
        {solvedWith === 0 ? "Solved with no spots. All you." : `Solved with ${solvedWith} spot${solvedWith === 1 ? "" : "s"}.`}
      </p>
    );
  }
  return (
    <button className={`${btnOutline} w-full py-2`} disabled={busy} onClick={onSolved}>
      I solved it
    </button>
  );
}
