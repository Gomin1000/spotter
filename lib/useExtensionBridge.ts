"use client";
// Receives problem text from the Spotter Chrome extension (extension/sidepanel.js)
// and reads it with readProblem(). Only trusts chrome-extension:// senders.
import { useEffect, useRef } from "react";
import { readProblem, type LeetCodeDifficulty, type ReadProblemResponse } from "./api";

export interface ExtensionPage {
  url: string;
  title: string;
}

export interface ExtensionBridgeHandlers {
  /** Called with the readProblem() result for the page the extension sent. */
  onResult: (res: ReadProblemResponse, page: ExtensionPage) => void;
  /** Called as soon as a page arrives, before readProblem() finishes (for a loading state). */
  onStart?: (page: ExtensionPage) => void;
  /** Called with a friendly message if readProblem() fails. */
  onError?: (message: string) => void;
}

interface ProblemMessage {
  type: "spotter:problem";
  text: string;
  url?: string;
  title?: string;
  /** LeetCode difficulty label read from the page, if any. */
  difficulty?: string;
}

const DIFFICULTIES: readonly LeetCodeDifficulty[] = ["Easy", "Medium", "Hard"];

function asDifficulty(value: unknown): LeetCodeDifficulty | undefined {
  return DIFFICULTIES.find((d) => d === value);
}

/** Sent back to the extension after readProblem() finishes. */
export interface ReadResultMessage {
  type: "spotter:read-result";
  ok: boolean;
  title: string;
  message: string;
}

function isProblemMessage(data: unknown): data is ProblemMessage {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  return d.type === "spotter:problem" && typeof d.text === "string" && d.text.trim() !== "";
}

export function useExtensionBridge(handlers: ExtensionBridgeHandlers): void {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      if (!e.origin.startsWith("chrome-extension://")) return;
      if (!isProblemMessage(e.data)) return;
      const page: ExtensionPage = {
        url: String(e.data.url ?? ""),
        title: String(e.data.title ?? ""),
      };
      // Tell the side panel how it went: { type: "spotter:read-result", ok, title, message }.
      const source = e.source as Window | null;
      const origin = e.origin;
      const reply = (result: Omit<ReadResultMessage, "type">) =>
        source?.postMessage({ type: "spotter:read-result", ...result } satisfies ReadResultMessage, origin);

      ref.current.onStart?.(page);
      try {
        const res = await readProblem({ text: e.data.text.slice(0, 20000) });
        // Keep the page URL so /api/rating can look up the official Codeforces rating.
        if (res.problem && page.url) res.problem.source_url = page.url;
        // Official LeetCode difficulty, for /api/rating.
        const difficulty = asDifficulty(e.data.difficulty);
        if (res.problem && difficulty) res.problem.difficulty = difficulty;
        ref.current.onResult(res, page);
        reply(
          res.found_problem && res.problem
            ? { ok: true, title: res.problem.title, message: res.message }
            : { ok: false, title: "", message: res.message || "No problem found on that page." },
        );
      } catch {
        const message = "Couldn't read that page. Try again, or paste the problem text.";
        ref.current.onError?.(message);
        reply({ ok: false, title: "", message });
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
