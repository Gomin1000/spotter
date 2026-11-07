"use client";
// Receives problem text from the Spotter Chrome extension (extension/sidepanel.js)
// and reads it with readProblem(). Only trusts chrome-extension:// senders.
import { useEffect, useRef } from "react";
import { readProblem, type ReadProblemResponse } from "./api";

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
      ref.current.onStart?.(page);
      try {
        const res = await readProblem({ text: e.data.text.slice(0, 20000) });
        ref.current.onResult(res, page);
      } catch {
        ref.current.onError?.("Couldn't read that page. Try again, or paste the problem text.");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);
}
