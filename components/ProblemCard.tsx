"use client";
import { useState } from "react";
import { getRating, type Problem, type RatingResponse } from "@/lib/api";
import { LoadingLine } from "./LoadingLine";
import { btnGhost, btnPrimary, btnSecondary, card, cardTitle, input, muted } from "./ui";
import { ERROR_LINES } from "./voice";

interface Props {
  problem: Problem | null;
  /** Where the problem came from, e.g. the page title from the extension. */
  loadedFrom: string | null;
  reading: boolean;
  onReadText: (text: string) => void;
  onReadScreen: () => void;
  /** Lets the card speak through the mascot. */
  onLine: (line: string) => void;
}

export function ProblemCard({ problem, loadedFrom, reading, onReadText, onReadScreen, onLine }: Props) {
  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={cardTitle}>Problem</h2>
        {problem && (
          <button className={btnGhost} onClick={() => setShowPaste((s) => !s)}>
            {showPaste ? "Hide" : "Load another"}
          </button>
        )}
      </div>

      {reading ? (
        <LoadingLine className="mb-3" />
      ) : problem ? (
        <ProblemView key={problem.title + (problem.source_url ?? "")} problem={problem} loadedFrom={loadedFrom} onLine={onLine} />
      ) : (
        <p className={`${muted} mb-3`}>
          Open a problem and click <b className="text-[#e6ecff]">Read this page</b>, press{" "}
          <kbd className="rounded bg-white/10 px-1 font-mono text-xs text-[#e6ecff]">Ctrl+V</kbd> with a screenshot, or
          paste the text.
        </p>
      )}

      {(!problem || showPaste) && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            className={`${input} h-24 resize-y`}
            placeholder="Paste the problem statement here…"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              disabled={reading || !text.trim()}
              onClick={() => {
                onReadText(text.trim());
                setShowPaste(false);
              }}
            >
              Read text
            </button>
            <button
              className={btnSecondary}
              disabled={reading}
              onClick={() => {
                setShowPaste(false);
                onReadScreen();
              }}
            >
              Read my screen
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function ProblemView({
  problem,
  loadedFrom,
  onLine,
}: {
  problem: Problem;
  loadedFrom: string | null;
  onLine: (line: string) => void;
}) {
  const [rating, setRating] = useState<RatingResponse | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const fromCodeforces = isCodeforcesUrl(problem.source_url);

  async function reveal() {
    setRatingBusy(true);
    setRatingError(null);
    try {
      const res = await getRating({ problem });
      setRating(res);
      if (res.mascot_line) onLine(res.mascot_line);
      if (!res.ok || res.rating == null) setRatingError("Even I can't tell how heavy this one is.");
    } catch {
      setRatingError(ERROR_LINES.rating);
      onLine(ERROR_LINES.rating);
    } finally {
      setRatingBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-lg font-bold leading-snug text-white">{problem.title}</h3>
      {loadedFrom && loadedFrom !== problem.title && (
        <p className="truncate text-xs text-[#6b7aa6]">from {loadedFrom}</p>
      )}

      <button
        className="self-start text-sm font-semibold text-[#5eead4] hover:underline"
        aria-expanded={showDetails}
        onClick={() => setShowDetails((s) => !s)}
      >
        {showDetails ? "▾ Hide details" : "▸ Show details"}
      </button>
      {showDetails && (
      <div className="rounded-xl bg-[#0a1430] px-3 py-2">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-[#d6def5]">{problem.summary}</p>
        {problem.constraints.length > 0 && (
          <ul className="mt-2 list-inside list-disc text-xs text-[#94a3c8]">
            {problem.constraints.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        )}
        {(problem.sample_input || problem.sample_output) && (
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Sample label="Input" value={problem.sample_input} />
            <Sample label="Output" value={problem.sample_output} />
          </div>
        )}
      </div>
      )}

      <div className="flex min-h-9 items-center gap-2">
        {rating && rating.ok && rating.rating != null ? (
          <div className="flex flex-col gap-1">
            <p className="rounded-lg border border-[#f472b6]/50 bg-[#f472b6]/10 px-3 py-1.5 text-sm font-semibold text-[#fbcfe8]">
              {rating.source === "codeforces"
                ? `Official CF rating: ${rating.rating}`
                : `Spotter's estimate: ~${rating.rating} (${rating.confidence} confidence)`}
            </p>
            {rating.source === "estimate" && fromCodeforces && (
              <p className="text-xs text-[#94a3c8]">Not rated on Codeforces yet</p>
            )}
          </div>
        ) : ratingBusy ? (
          <LoadingLine />
        ) : (
          <>
            <button className={btnSecondary} onClick={reveal} title="Spoiler: shows the problem's difficulty">
              🏋️ Reveal weight
            </button>
            {ratingError ? (
              <span className="text-xs text-[#fca5a5]">{ratingError}</span>
            ) : (
              <span className="text-xs text-[#6b7aa6]">spoiler</span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function isCodeforcesUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    return /(^|\.)codeforces\.(com|ml|net)$/i.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

function Sample({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#6b7aa6]">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-lg bg-black/30 p-2 font-mono text-xs text-[#e6ecff]">{value || "—"}</pre>
    </div>
  );
}
