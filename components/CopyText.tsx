"use client";
import { useState } from "react";

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
    <span className="inline-flex items-center gap-2 rounded-lg border border-[#24345f] bg-[#0a1430] py-1 pl-3 pr-1">
      <code className="select-all font-mono text-sm text-[#e6ecff]">{text}</code>
      <button
        type="button"
        onClick={copy}
        className="rounded-md bg-[#2dd4bf]/15 px-2 py-1 text-xs font-semibold text-[#5eead4] transition hover:bg-[#2dd4bf]/25"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </span>
  );
}
