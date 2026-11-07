"use client";
import { useEffect, useState } from "react";
import type { MascotPose } from "@/lib/api";

const POSE_LABEL: Record<MascotPose, string> = {
  idle: "waiting",
  spotting: "spotting you",
  "side-eye": "side-eyeing you",
  flex: "flexing",
  "no-free-reps": "refusing",
};

export function Mascot({ pose, line }: { pose: MascotPose; line: string }) {
  // Warm the cache so a pose change never shows an empty tile.
  useEffect(() => {
    for (const p of Object.keys(POSE_LABEL)) new Image().src = `/mascot/${p}.png`;
  }, []);

  // Poses whose PNG failed to load fall back to idle.
  const [missing, setMissing] = useState<Partial<Record<MascotPose, true>>>({});
  const shown: MascotPose = missing[pose] ? "idle" : pose;

  return (
    <section className="flex items-center gap-3">
      {/* key={pose} remounts the tile so it bounces once on every pose change. */}
      <div key={pose} className="mascot-bounce h-28 w-28 shrink-0 overflow-hidden rounded-[14px]">
        {/* eslint-disable-next-line @next/next/no-img-element -- plain img so new PNGs need no config */}
        <img
          src={`/mascot/${shown}.png`}
          alt={`Spotter, ${POSE_LABEL[pose]}`}
          width={112}
          height={112}
          className="h-full w-full object-cover"
          onError={() => shown !== "idle" && setMissing((m) => ({ ...m, [shown]: true }))}
        />
      </div>
      <div className="relative min-h-[56px] flex-1 border border-dust/30 px-3 py-2 text-[15px] leading-snug text-chalk">
        {/* Tail of the speech bubble, pointing at the mascot. */}
        <span
          aria-hidden
          className="absolute -left-[6px] top-1/2 h-[10px] w-[10px] -translate-y-1/2 rotate-45 border-b border-l border-dust/30 bg-rubber"
        />
        <span aria-live="polite" className="line-clamp-3" title={line}>
          {line}
        </span>
      </div>
    </section>
  );
}
