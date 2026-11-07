"use client";
import { useState } from "react";
import { getRating, type Problem, type RatingResponse } from "@/lib/api";
import { LoadingLine } from "./LoadingLine";
import { btnSecondary, btnTag, divider, heading, input, label, sticker } from "./ui";
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
  /** True while "New problem" is open: the next read starts a fresh log even for the same problem. */
  onNewProblemChange: (open: boolean) => void;
}

export function ProblemCard({ problem, loadedFrom, reading, onReadText, onReadScreen, onLine, onNewProblemChange }: Props) {
  const [text, setText] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  function setPaste(open: boolean) {
    setShowPaste(open);
    onNewProblemChange(open);
  }

  return (
    <section className={`${sticker} flex flex-col gap-3 p-4`}>
      {reading ? (
        <LoadingLine />
      ) : problem ? (
        <ProblemView
          key={problem.title + (problem.source_url ?? "")}
          problem={problem}
          loadedFrom={loadedFrom}
          onLine={onLine}
          pasteOpen={showPaste}
          onTogglePaste={() => setPaste(!showPaste)}
        />
      ) : (
        <>
          <p className={label}>The problem</p>
          <h2 className={`${heading} text-2xl leading-[0.95]`}>What are we lifting today?</h2>
          <p className="text-sm font-medium text-slate">
            Open a problem and click Read this page, press{" "}
            <kbd className="rounded-ui border-2 border-ink bg-paper px-1 font-mono text-[11px] font-bold text-ink">Ctrl+V</kbd>{" "}
            with a screenshot, or paste the statement below.
          </p>
        </>
      )}

      {(!problem || showPaste) && (
        <div className="flex flex-col gap-3 pt-1">
          <textarea
            className={`${input} h-24 resize-y`}
            placeholder="Paste the problem statement"
            aria-label="Problem statement"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <button
              className={btnSecondary}
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
  const sourceLabel = sourceLabelFor(problem, loadedFrom);

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
    <div className="flex flex-col gap-3">
      <div>
        <p className={label}>
          The problem
          {sourceLabel &&
            (problem.source_url ? (
              <>
                {" / "}
                <a href={problem.source_url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-ink">
                  {sourceLabel}
                </a>
              </>
            ) : (
              <> / {sourceLabel}</>
            ))}
        </p>
        <h2 className={`${heading} mt-1.5 text-[26px] leading-[0.95]`}>{problem.title}</h2>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button className={btnTag} aria-expanded={showStatement} onClick={() => setShowStatement((s) => !s)}>
          {showStatement ? "Hide statement" : "Show statement"}
        </button>
        {!rating?.ok && (
          <button
            className={`${btnTag} bg-sun`}
            onClick={reveal}
            disabled={ratingBusy}
            title="Spoiler: shows how hard the problem is"
          >
            {ratingBusy ? "Weighing…" : "Reveal weight"}
          </button>
        )}
        <button className={btnTag} aria-expanded={pasteOpen} onClick={onTogglePaste}>
          {pasteOpen ? "Keep this problem" : "New problem"}
        </button>
      </div>

      {rating?.ok && <Weight rating={rating} fromCodeforces={fromCodeforces} />}
      {ratingError && <p className="text-sm font-bold">{ratingError}</p>}

      {showStatement && (
        <div className={`${divider} flex flex-col gap-3 pt-3 text-sm leading-relaxed`}>
          <p className="whitespace-pre-wrap">{problem.summary}</p>
          {problem.constraints.length > 0 && (
            <ul className="list-inside list-disc text-slate">
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
    rating.rating != null ? `Spotter's estimate: ~${rating.rating}, ${rating.confidence} confidence` : null;
  const box = "border-t-2 border-dashed border-ink/30 pt-3";

  if (rating.source === "leetcode") {
    return (
      <div className={box}>
        <p className={`${heading} text-lg leading-none`}>LeetCode: {rating.difficulty ?? "Unrated"}</p>
        {estimate && <p className={`${label} mt-1.5`}>{estimate}</p>}
      </div>
    );
  }
  if (rating.rating == null) return null;
  if (rating.source === "codeforces") {
    return (
      <div className={box}>
        <p className={`${heading} text-lg leading-none`}>Codeforces: {rating.rating}</p>
        <p className={`${label} mt-1.5`}>Official rating</p>
      </div>
    );
  }
  return (
    <div className={box}>
      <p className={`${heading} text-lg leading-none`}>~{rating.rating}</p>
      <p className={`${label} mt-1.5`}>
        Spotter&apos;s estimate, {rating.confidence} confidence{fromCodeforces ? ". Not rated on Codeforces yet" : ""}
      </p>
    </div>
  );
}

const SITES: [RegExp, string][] = [
  [/(^|\.)leetcode\.(com|cn)$/i, "LeetCode"],
  [/(^|\.)codeforces\.(com|ml|net)$/i, "Codeforces"],
  [/(^|\.)atcoder\.jp$/i, "AtCoder"],
  [/(^|\.)hackerrank\.com$/i, "HackerRank"],
  [/(^|\.)kattis\.com$/i, "Kattis"],
  [/(^|\.)cses\.fi$/i, "CSES"],
];

/**
 * "On LeetCode" for known judges, "On example.com" for other links. The page title is only
 * shown when it adds something; tab titles like "1. Two Sum" just repeat the problem name.
 */
function sourceLabelFor(problem: Problem, loadedFrom: string | null): string | null {
  const host = hostOf(problem.source_url);
  if (host) {
    const site = SITES.find(([re]) => re.test(host))?.[1];
    return `On ${site ?? host}`;
  }
  if (!loadedFrom) return null;
  const norm = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  return norm(loadedFrom).includes(norm(problem.title)) ? null : loadedFrom;
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

function Sample({ label: name, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className={label}>{name}</p>
      <pre className="mt-1 overflow-x-auto rounded-ui border-2 border-ink bg-paper p-2 font-mono text-xs leading-relaxed">
        {value || "(none)"}
      </pre>
    </div>
  );
}
