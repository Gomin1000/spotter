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
    <p className={`text-sm text-dust ${className}`} role="status">
      {LOADING_LINES[i]}
    </p>
  );
}
