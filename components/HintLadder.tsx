"use client";
import { useState } from "react";
import { RUNG_NAMES, type Rung } from "@/lib/api";
import { LoadingLine } from "./LoadingLine";
import { btnPrimary, btnSecondary, card, cardTitle, input, muted } from "./ui";

export interface GivenHint {
  rung: Rung;
  text: string;
}

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

const RUNGS: Rung[] = [1, 2, 3, 4];
// Bigger plate = heavier rung.
const PLATE_SIZE: Record<Rung, string> = { 1: "h-10", 2: "h-12", 3: "h-14", 4: "h-16" };

export function HintLadder({ hints, hasProblem, busy, code, onCodeChange, onSpotMe, onTalk, solvedWith, onSolved }: Props) {
  const [message, setMessage] = useState("");
  const done = hints.length >= 4;
  const next = (Math.min(hints.length + 1, 4)) as Rung;

  async function send() {
    const m = message.trim();
    if (!m) return;
    if (await onTalk(m)) setMessage("");
  }

  return (
    <section className={card}>
      <h2 className={`${cardTitle} mb-3`}>Hint ladder</h2>

      {/* The four plates */}
      <div className="mb-4 flex items-end justify-between gap-1.5">
        {RUNGS.map((r) => {
          const given = hints.some((h) => h.rung === r);
          const isNext = !done && r === next;
          return (
            <div key={r} className="flex flex-1 flex-col items-center gap-1">
              <div
                className={`${PLATE_SIZE[r]} flex w-full items-center justify-center rounded-lg border-2 text-sm font-black transition ${
                  given
                    ? "border-[#2dd4bf] bg-[#2dd4bf]/20 text-[#5eead4]"
                    : isNext
                      ? "border-[#f97316] bg-[#f97316]/10 text-[#fdba74]"
                      : "border-[#24345f] bg-[#0a1430] text-[#4b5a86]"
                }`}
              >
                {r}
              </div>
              <span className={`text-[10px] font-semibold ${given ? "text-[#5eead4]" : "text-[#6b7aa6]"}`}>
                {RUNG_NAMES[r]}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <button className={`${btnPrimary} flex-1 py-3 text-base`} disabled={!hasProblem || busy || done} onClick={onSpotMe}>
          {done ? "Ladder complete. Lift it yourself." : `Spot me · ${RUNG_NAMES[next]}`}
        </button>
      </div>
      {busy && <LoadingLine className="mb-3" />}
      {!hasProblem && <p className={`${muted} mb-3`}>Load a problem first, then I&apos;ll spot you.</p>}

      {hints.length > 0 && (
        <ol className="mb-3 flex flex-col gap-2">
          {hints.map((h, i) => (
            <li key={i} className="rounded-xl border-l-4 border-[#2dd4bf] bg-[#0a1430] p-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#f472b6]">
                Rung {h.rung} · {RUNG_NAMES[h.rung]}
              </p>
              {h.rung === 4 ? (
                <pre className="overflow-x-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-[#e6ecff]">{h.text}</pre>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#e6ecff]">{h.text}</p>
              )}
            </li>
          ))}
        </ol>
      )}

      <details className="mb-3 rounded-xl bg-[#0a1430] px-3 py-2">
        <summary className="cursor-pointer select-none text-sm font-semibold text-[#5eead4]">
          Paste your code {code.trim() && <span className="text-xs text-[#6b7aa6]">({code.split("\n").length} lines)</span>}
        </summary>
        <textarea
          className={`${input} mt-2 h-32 resize-y font-mono text-xs`}
          placeholder="Optional: I'll look at your attempt when I spot you."
          value={code}
          spellCheck={false}
          onChange={(e) => onCodeChange(e.target.value)}
        />
      </details>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          className={input}
          placeholder="Talk to Spotter…"
          value={message}
          disabled={!hasProblem}
          onChange={(e) => setMessage(e.target.value)}
        />
        <button className={btnSecondary} type="submit" disabled={!hasProblem || busy || !message.trim()}>
          Send
        </button>
      </form>

      {hasProblem &&
        (solvedWith != null ? (
          <p className="mt-3 rounded-xl border border-[#2dd4bf]/60 bg-[#2dd4bf]/10 px-3 py-2 text-center text-sm font-bold text-[#5eead4]">
            💪 {solvedWith === 0 ? "Solved with no spots. All you." : `Solved with ${solvedWith} spot${solvedWith === 1 ? "" : "s"}`}
          </p>
        ) : (
          <button
            className="mt-3 w-full rounded-xl border-2 border-[#2dd4bf] py-2 font-bold text-[#5eead4] transition hover:bg-[#2dd4bf]/10 disabled:opacity-40"
            disabled={busy}
            onClick={onSolved}
          >
            I solved it 💪
          </button>
        ))}
    </section>
  );
}
