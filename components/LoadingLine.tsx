"use client";
import { useEffect, useState } from "react";
import { LOADING_LINES } from "./voice";

/** Rotating gym loading message. Render only while something is loading. */
export function LoadingLine({ className = "" }: { className?: string }) {
  const [i, setI] = useState(() => Math.floor(Math.random() * LOADING_LINES.length));
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % LOADING_LINES.length), 1400);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={`inline-flex items-center gap-2 text-sm text-[#5eead4] ${className}`} role="status">
      <span className="h-2 w-2 animate-pulse rounded-full bg-[#f472b6]" />
      {LOADING_LINES[i]}
    </span>
  );
}
