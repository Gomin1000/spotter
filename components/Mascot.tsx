"use client";
import { useEffect, useState } from "react";
import type { MascotPose } from "@/lib/api";

const POSES: MascotPose[] = ["idle", "spotting", "side-eye", "flex", "no-free-reps"];

const POSE_EMOJI: Record<MascotPose, string> = {
  idle: "🤖",
  spotting: "🏋️",
  "side-eye": "👀",
  flex: "💪",
  "no-free-reps": "🙅",
};

/** Checks which public/mascot/<pose>.png files exist, so new PNGs work as soon as they're dropped in. */
function useAvailablePoses(): Partial<Record<MascotPose, boolean>> {
  const [available, setAvailable] = useState<Partial<Record<MascotPose, boolean>>>({});
  useEffect(() => {
    let alive = true;
    for (const pose of POSES) {
      const img = new Image();
      img.onload = () => alive && setAvailable((a) => ({ ...a, [pose]: true }));
      img.onerror = () => alive && setAvailable((a) => ({ ...a, [pose]: false }));
      img.src = `/mascot/${pose}.png`;
    }
    return () => {
      alive = false;
    };
  }, []);
  return available;
}

export function Mascot({ pose, line }: { pose: MascotPose; line: string }) {
  const available = useAvailablePoses();

  return (
    <section className="flex items-end gap-3">
      <div className="relative h-28 w-28 shrink-0">
        {available[pose] ? (
          // eslint-disable-next-line @next/next/no-img-element -- plain img so new PNGs need no config
          <img
            key={pose}
            src={`/mascot/${pose}.png`}
            alt={`Spotter (${pose})`}
            className="h-full w-full object-contain drop-shadow-[0_6px_16px_rgba(45,212,191,0.35)]"
          />
        ) : (
          <div
            key={pose}
            className="flex h-full w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#2dd4bf]/60 bg-gradient-to-br from-[#16264f] to-[#2a1640] text-center"
            aria-label={`Spotter (${pose})`}
          >
            <span className="text-4xl">{POSE_EMOJI[pose]}</span>
            <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#f472b6]">{pose}</span>
          </div>
        )}
      </div>
      <div className="relative mb-4 min-h-12 flex-1 rounded-2xl rounded-bl-sm border border-[#f472b6]/50 bg-[#1b1f4a] px-3 py-2 text-sm font-medium text-[#f5f7ff]">
        <span className="absolute -left-2 bottom-2 h-3 w-3 rotate-45 border-b border-l border-[#f472b6]/50 bg-[#1b1f4a]" />
        <span aria-live="polite">{line}</span>
      </div>
    </section>
  );
}
