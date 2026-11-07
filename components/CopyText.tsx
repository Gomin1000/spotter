"use client";
import { useState } from "react";
import { btnTag } from "./ui";

/** Shows text in monospace with a Copy button (for chrome:// URLs, which websites can't link to). */
export function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3 rounded-ui border-2 border-ink bg-paper py-1.5 pl-3 pr-1.5">
      <code className="select-all font-mono text-sm font-bold text-ink">{text}</code>
      <button type="button" onClick={copy} className={`${btnTag} bg-sun`}>
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}
