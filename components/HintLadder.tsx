"use client";
import { useState } from "react";
import { RUNG_NAMES, type Rung } from "@/lib/api";
import { LoadingLine } from "./LoadingLine";
import { PLATE, STEP_LABEL, btnPrimary, btnSecondary, divider, heading, input, label, sticker } from "./ui";

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
    <section className="flex flex-col gap-6">
      {hints.length > 0 && (
        <ol className="flex flex-col gap-5" aria-label="Training log">
          {hints.map((h, i) =>
            h.kind === "check" ? <CheckEntry key={i} question={h.question} text={h.text} /> : <StepEntry key={i} hint={h} />,
          )}
        </ol>
      )}

      {hasProblem && <Solved solvedWith={solvedWith} busy={busy} onSolved={onSolved} />}

      <div className="flex flex-col gap-3">
        {done ? (
          <div className={`${sticker} bg-mint-soft px-4 py-3 text-center`}>
            <p className={`${heading} text-xl leading-tight`}>That&apos;s every step.</p>
            <p className={`${label} mt-1 text-ink`}>You&apos;ve got this</p>
          </div>
        ) : (
          <button
            className={`${btnPrimary} flex w-full flex-col items-center px-4 py-3`}
            disabled={!hasProblem || busy}
            onClick={onSpotMe}
          >
            <span className={`${heading} text-[28px] leading-none`}>Spot me</span>
            <span className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-widest">
              {hasProblem ? `Next: ${RUNG_NAMES[next]}` : "Load a problem first"}
            </span>
          </button>
        )}
        {busy && <LoadingLine />}
      </div>

      <div className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className={label}>
            Paste your code{code.trim() && ` / ${code.split("\n").length} lines`}
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
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor="talk" className={label}>
            Talk to Spotter
          </label>
          <div className="flex gap-3">
            <input
              id="talk"
              className={input}
              placeholder={!hasProblem ? "Load a problem first" : checking ? "Ask about your code" : "Ask about the problem"}
              value={message}
              disabled={!hasProblem}
              onChange={(e) => setMessage(e.target.value)}
            />
            <button className={btnSecondary} type="submit" disabled={!hasProblem || busy || !message.trim()}>
              Send
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

function Tag({ className, children }: { className: string; children: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className={`shrink-0 rounded-ui border-2 border-ink px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest ${className}`}
    >
      {children}
    </span>
  );
}

function StepEntry({ hint }: { hint: GivenHint }) {
  const plate = PLATE[hint.rung];
  return (
    <li className={`${sticker} p-4`}>
      <div className="flex items-start gap-3">
        <Tag className={`${plate.bg} ${plate.text}`}>0{hint.rung}</Tag>
        <div className="min-w-0">
          <h3 className={`${heading} text-xl leading-none`}>
            <span className="sr-only">Step {hint.rung}: </span>
            {RUNG_NAMES[hint.rung]}
          </h3>
          <p className={`${label} mt-1`}>{STEP_LABEL[hint.rung]}</p>
        </div>
      </div>
      <div className={`${divider} mt-3 pt-3`}>
        {hint.rung === 4 ? (
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-ui border-2 border-ink bg-paper p-3 font-mono text-xs leading-relaxed">
            {hint.text}
          </pre>
        ) : (
          <p className="whitespace-pre-wrap text-[15px] font-medium leading-relaxed">{hint.text}</p>
        )}
      </div>
    </li>
  );
}

/** A reply about the user's code. It sits in the log but never loads a plate. */
function CheckEntry({ question, text }: { question: string; text: string }) {
  return (
    <li className={`${sticker} p-4`}>
      <div className="flex items-start gap-3">
        <Tag className="bg-white text-ink">Q</Tag>
        <div className="min-w-0">
          <h3 className={`${heading} text-xl leading-none`}>Code check</h3>
          <p className={`${label} mt-1`}>Your question</p>
        </div>
      </div>
      <div className={`${divider} mt-3 pt-3`}>
        <p className="text-sm font-bold text-slate">&ldquo;{question}&rdquo;</p>
        <p className="mt-2 whitespace-pre-wrap text-[15px] font-medium leading-relaxed">{text}</p>
      </div>
    </li>
  );
}

function Solved({ solvedWith, busy, onSolved }: { solvedWith: number | null; busy: boolean; onSolved: () => void }) {
  if (solvedWith != null) {
    return (
      <div className={`${sticker} bg-sun px-4 py-3`}>
        <p className={`${heading} text-xl leading-none`}>
          {solvedWith === 0 ? "Solved. No spots." : `Solved with ${solvedWith} spot${solvedWith === 1 ? "" : "s"}`}
        </p>
        <p className={`${label} mt-1.5 text-ink`}>{solvedWith === 0 ? "All you" : "Clean rep"}</p>
      </div>
    );
  }
  return (
    <button className={`${btnSecondary} w-full py-2.5`} disabled={busy} onClick={onSolved}>
      I solved it
    </button>
  );
}
