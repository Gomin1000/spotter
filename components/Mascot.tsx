"use client";
import { useEffect, useState } from "react";
import type { MascotPose } from "@/lib/api";

const POSES: MascotPose[] = ["idle", "spotting", "side-eye", "flex", "no-free-reps"];

const POSE_LABEL: Record<MascotPose, string> = {
  idle: "waiting",
  spotting: "spotting you",
  "side-eye": "side-eyeing you",
  flex: "flexing",
  "no-free-reps": "refusing",
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
    <section className="flex items-center gap-3">
      {/* key={pose} remounts the wrapper so it bounces once on every pose change. */}
      <div key={pose} className="mascot-bounce h-24 w-24 shrink-0">
        {available[pose] ? (
          // eslint-disable-next-line @next/next/no-img-element -- plain img so new PNGs need no config
          <img src={`/mascot/${pose}.png`} alt={`Spotter, ${POSE_LABEL[pose]}`} className="h-full w-full object-contain" />
        ) : (
          <RobotSketch pose={pose} />
        )}
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

/** Line-drawn stand-in until the pose PNG exists. */
function RobotSketch({ pose }: { pose: MascotPose }) {
  const look = pose === "side-eye" ? 5 : 0;
  return (
    <svg viewBox="0 0 96 96" className="h-full w-full" role="img" aria-label={`Spotter, ${POSE_LABEL[pose]}`}>
      <g fill="none" stroke="var(--chalk)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="48" y1="10" x2="48" y2="20" />
        <circle cx="48" cy="8" r="3" />
        <rect x="24" y="20" width="48" height="36" rx="6" />
        <path d="M30 56 L26 84 M66 56 L70 84 M26 84 L70 84" />
        {pose === "flex" ? (
          <path d="M26 64 Q12 60 14 46 M70 64 Q84 60 82 46" />
        ) : (
          <path d="M26 64 L14 78 M70 64 L82 78" />
        )}
        {pose === "no-free-reps" ? (
          <path d="M38 47 L58 47" />
        ) : pose === "flex" || pose === "spotting" ? (
          <path d="M38 45 Q48 52 58 45" />
        ) : (
          <path d="M40 47 L56 47" />
        )}
      </g>
      <circle cx={38 + look} cy="35" r="3.5" fill="var(--chalk)" />
      <circle cx={58 + look} cy="35" r="3.5" fill="var(--chalk)" />
    </svg>
  );
}
