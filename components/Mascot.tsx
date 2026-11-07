"use client";
import { useEffect, useState } from "react";
import type { MascotPose } from "@/lib/api";

const POSES: Record<MascotPose, { name: string; cue: string; bg: string }> = {
  idle: { name: "Idle", cue: "Arms crossed", bg: "#f6e7c8" },
  spotting: { name: "Spotting", cue: "Spotting you", bg: "#f6e7c8" },
  "side-eye": { name: "Side-eye", cue: "Caught you slacking", bg: "#e1e8f5" },
  flex: { name: "Flex", cue: "Clean rep", bg: "#e2efd6" },
  "no-free-reps": { name: "No free reps", cue: "No free reps", bg: "#f6d8cc" },
};

/** Compact pose strip: a 96 px mascot tile, then the pose name, cue and current line. */
export function Mascot({ pose, line }: { pose: MascotPose; line: string }) {
  // Warm the cache so a pose change never shows an empty tile.
  useEffect(() => {
    for (const p of Object.keys(POSES)) new Image().src = `/mascot/${p}.png`;
  }, []);

  // Poses whose PNG failed to load fall back to idle art (the caption still names the pose).
  const [missing, setMissing] = useState<Partial<Record<MascotPose, true>>>({});
  const shown: MascotPose = missing[pose] ? "idle" : pose;
  const info = POSES[pose];

  return (
    <section className="flex items-center gap-3.5">
      <div
        className="h-24 w-24 shrink-0 overflow-hidden rounded-ui border-[3px] border-ink shadow-hard-sm"
        style={{ background: POSES[shown].bg }}
      >
        {/* key={pose} remounts the image so it bounces once on every pose change. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- plain img so new PNGs need no config */}
        <img
          key={pose}
          src={`/mascot/${shown}.png`}
          alt={`Spotter, ${info.cue.toLowerCase()}`}
          className="mascot-bounce h-full w-full object-cover"
          onError={() => shown !== "idle" && setMissing((m) => ({ ...m, [shown]: true }))}
        />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-black uppercase leading-none tracking-tight">{info.name}</h2>
        <p className="mt-1 truncate font-mono text-[10px] font-bold uppercase tracking-widest text-slate">{info.cue}</p>
        <p
          aria-live="polite"
          title={line}
          className="mt-2 line-clamp-2 border-t-2 border-dashed border-ink/30 pt-1.5 text-sm font-bold leading-snug"
        >
          &ldquo;{line}&rdquo;
        </p>
      </div>
    </section>
  );
}
