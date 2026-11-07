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

/** Sticky pose card: the mascot panel on top, then the pose name, cue and current line. */
export function Mascot({ pose, line }: { pose: MascotPose; line: string }) {
  // Warm the cache so a pose change never shows an empty panel.
  useEffect(() => {
    for (const p of Object.keys(POSES)) new Image().src = `/mascot/${p}.png`;
  }, []);

  // Poses whose PNG failed to load fall back to idle art (the caption still names the pose).
  const [missing, setMissing] = useState<Partial<Record<MascotPose, true>>>({});
  const shown: MascotPose = missing[pose] ? "idle" : pose;
  const info = POSES[pose];

  return (
    <article className="overflow-hidden rounded-ui border-4 border-ink bg-white shadow-hard">
      <div className="flex h-[150px] justify-center border-b-4 border-ink" style={{ background: POSES[shown].bg }}>
        {/* key={pose} remounts the image so it bounces once on every pose change. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- plain img so new PNGs need no config */}
        <img
          key={pose}
          src={`/mascot/${shown}.png`}
          alt={`Spotter, ${info.cue.toLowerCase()}`}
          className="mascot-bounce h-full w-auto object-contain"
          onError={() => shown !== "idle" && setMissing((m) => ({ ...m, [shown]: true }))}
        />
      </div>
      <div className="px-3.5 pb-3 pt-2.5">
        <h2 className="text-xl font-black uppercase leading-none tracking-tight">{info.name}</h2>
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-widest text-slate">{info.cue}</p>
        <p
          aria-live="polite"
          title={line}
          className="mt-2.5 line-clamp-2 border-t-2 border-dashed border-ink/30 pt-2 text-sm font-bold leading-snug"
        >
          &ldquo;{line}&rdquo;
        </p>
      </div>
    </article>
  );
}
