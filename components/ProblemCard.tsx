"use client";
import { useState } from "react";
import { getRating, type Problem, type RatingResponse } from "@/lib/api";
import { LoadingLine } from "./LoadingLine";
import { btnOutline, btnText, input, muted } from "./ui";
import { ERROR_LINES } from "./voice";

interface Props {
  problem: Problem | null;
  /** Where the problem came from, e.g. the page title from the extension. */
  loadedFrom: string | null;
  reading: boolean;
  onReadText: (text: string) => void;
  onReadScreen: () => void;
  /** Lets the section speak through the mascot. */
  onLine: (line: string) => void;
}

export function ProblemCard({ problem, loadedFrom, reading, onReadText, onReadScreen, onLine }: Props) {
  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  return (
    <section className="flex flex-col gap-3">
      {reading ? (
        <LoadingLine />
      ) : problem ? (
        <ProblemView
          key={problem.title + (problem.source_url ?? "")}
          problem={problem}
          loadedFrom={loadedFrom}
          onLine={onLine}
          pasteOpen={showPaste}
          onTogglePaste={() => setShowPaste((s) => !s)}
        />
      ) : (
        <>
          <h2 className="font-display text-[28px] font-semibold leading-tight">What are we lifting today?</h2>
          <p className={muted}>
            Open a problem and click Read this page, press{" "}
            <kbd className="rounded-ui bg-mat px-1.5 py-0.5 font-mono text-xs text-chalk">Ctrl+V</kbd> with a
            screenshot, or paste the statement below.
          </p>
        </>
      )}

      {(!problem || showPaste) && (
        <div className="flex flex-col gap-2">
          <textarea
            className={`${input} h-24 resize-y`}
            placeholder="Paste the problem statement"
            aria-label="Problem statement"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              className={btnOutline}
              disabled={reading || !text.trim()}
              onClick={() => {
                onReadText(text.trim());
                setShowPaste(false);
              }}
            >
              Read text
            </button>
            <button
              className={btnOutline}
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
  pasteOpen,
  onTogglePaste,
}: {
  problem: Problem;
  loadedFrom: string | null;
  onLine: (line: string) => void;
  pasteOpen: boolean;
  onTogglePaste: () => void;
}) {
  const [rating, setRating] = useState<RatingResponse | null>(null);
  const [ratingBusy, setRatingBusy] = useState(false);
  const [ratingError, setRatingError] = useState<string | null>(null);
  const [showStatement, setShowStatement] = useState(false);
  const fromCodeforces = isCodeforcesUrl(problem.source_url);
  const sourceLabel = loadedFrom && loadedFrom !== problem.title ? loadedFrom : hostOf(problem.source_url);

  async function reveal() {
    setRatingBusy(true);
    setRatingError(null);
    try {
      const res = await getRating({ problem });
      setRating(res);
      if (res.mascot_line) onLine(res.mascot_line);
      const hasAnything = res.ok && (res.rating != null || (res.source === "leetcode" && res.difficulty));
      if (!hasAnything) setRatingError("Even I can't tell how heavy this one is.");
    } catch {
      setRatingError(ERROR_LINES.rating);
      onLine(ERROR_LINES.rating);
    } finally {
      setRatingBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-display text-[30px] font-semibold leading-[1.05]">{problem.title}</h2>
      {sourceLabel &&
        (problem.source_url ? (
          <a
            href={problem.source_url}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm text-dust underline decoration-dust/40 underline-offset-4 hover:text-chalk"
          >
            {sourceLabel}
          </a>
        ) : (
          <p className="truncate text-sm text-dust">{sourceLabel}</p>
        ))}

      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1">
        <button className={btnText} aria-expanded={showStatement} onClick={() => setShowStatement((s) => !s)}>
          {showStatement ? "Hide statement" : "Show statement"}
        </button>
        {!rating?.ok && !ratingBusy && (
          <button className={btnText} onClick={reveal} title="Spoiler: shows how hard the problem is">
            Reveal weight
          </button>
        )}
        <button className={btnText} aria-expanded={pasteOpen} onClick={onTogglePaste}>
          {pasteOpen ? "Keep this problem" : "New problem"}
        </button>
      </div>

      {ratingBusy && <LoadingLine />}
      {rating?.ok && <Weight rating={rating} fromCodeforces={fromCodeforces} />}
      {ratingError && <p className="text-sm text-dust">{ratingError}</p>}

      {showStatement && (
        <div className="mt-2 flex flex-col gap-3 text-[15px] leading-relaxed">
          <p className="whitespace-pre-wrap">{problem.summary}</p>
          {problem.constraints.length > 0 && (
            <ul className="list-inside list-disc text-sm text-dust">
              {problem.constraints.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          {(problem.sample_input || problem.sample_output) && (
            <div className="grid grid-cols-2 gap-3">
              <Sample label="Sample input" value={problem.sample_input} />
              <Sample label="Sample output" value={problem.sample_output} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Weight({ rating, fromCodeforces }: { rating: RatingResponse; fromCodeforces: boolean }) {
  const estimate =
    rating.rating != null ? `Spotter's estimate: about ${rating.rating}, ${rating.confidence} confidence` : null;

  if (rating.source === "leetcode") {
    return (
      <div className="mt-1">
        <p className="font-display text-xl font-semibold">LeetCode: {rating.difficulty ?? "Unrated"}</p>
        {estimate && <p className="text-sm text-dust">{estimate}</p>}
      </div>
    );
  }
  if (rating.rating == null) return null;
  if (rating.source === "codeforces") {
    return <p className="mt-1 font-display text-xl font-semibold">Codeforces rating: {rating.rating}</p>;
  }
  return (
    <div className="mt-1">
      <p className="font-display text-xl font-semibold">About {rating.rating}</p>
      <p className="text-sm text-dust">
        Spotter&apos;s estimate, {rating.confidence} confidence{fromCodeforces ? ". Not rated on Codeforces yet." : ""}
      </p>
    </div>
  );
}

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
    <div className="min-w-0">
      <p className="text-sm text-dust">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-ui bg-mat p-2 font-mono text-xs leading-relaxed text-chalk">
        {value || "(none)"}
      </pre>
    </div>
  );
}
