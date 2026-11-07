"use client";
import type { WatchStatus } from "@/lib/api";
import { OPEN_IN_TAB_MESSAGE, type ScreenWatcher } from "@/lib/useScreenWatcher";
import { btnGhost, btnPrimary, btnSecondary, card, cardTitle, muted } from "./ui";

const PILL: Record<WatchStatus, { label: string; cls: string }> = {
  focused: { label: "Focused", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-400/50" },
  stuck: { label: "Stuck", cls: "bg-amber-500/15 text-amber-300 border-amber-400/50" },
  distracted: { label: "Distracted", cls: "bg-red-500/15 text-red-300 border-red-400/50" },
  idle: { label: "Idle", cls: "bg-slate-500/15 text-slate-300 border-slate-400/50" },
  unknown: { label: "Unknown", cls: "bg-slate-500/15 text-slate-400 border-slate-500/50" },
};

interface Props {
  watcher: ScreenWatcher;
  canSpot: boolean;
  onAcceptSpot: () => void;
}

export function SessionCard({ watcher, canSpot, onAcceptSpot }: Props) {
  const pill = watcher.status ? PILL[watcher.status] : null;

  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={cardTitle}>Session</h2>
        <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-[#94a3c8]">
          Demo mode
          <input
            type="checkbox"
            className="peer sr-only"
            checked={watcher.demoMode}
            onChange={(e) => watcher.setDemoMode(e.target.checked)}
          />
          <span className="relative h-5 w-9 rounded-full bg-[#24345f] transition peer-checked:bg-[#f472b6] after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
        </label>
      </div>

      <div className="flex items-center gap-3">
        {watcher.isWatching ? (
          <button className={btnSecondary} onClick={watcher.stop}>
            ■ Stop watching
          </button>
        ) : (
          <button className={btnPrimary} onClick={watcher.start}>
            ● Start watching
          </button>
        )}
        {watcher.isWatching && (
          pill ? (
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${pill.cls}`}>{pill.label}</span>
          ) : (
            <span className="text-xs text-[#6b7aa6]">First check coming up…</span>
          )
        )}
      </div>

      {watcher.isWatching && watcher.reason && <p className={`${muted} mt-2`}>{watcher.reason}</p>}
      {!watcher.isWatching && !watcher.error && (
        <p className={`${muted} mt-2`}>
          Share your screen and I&apos;ll check in every {watcher.demoMode ? "5" : "20"} s.
        </p>
      )}

      {watcher.offerHint && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#f97316]/60 bg-[#f97316]/10 p-3">
          <p className="flex-1 text-sm font-semibold text-[#fdba74]">Want a spot?</p>
          <button
            className={btnPrimary}
            disabled={!canSpot}
            onClick={() => {
              watcher.dismissOffer();
              onAcceptSpot();
            }}
          >
            Spot me
          </button>
          <button className={btnGhost} onClick={watcher.dismissOffer}>
            Nah
          </button>
        </div>
      )}

      {watcher.error && (
        <div className="mt-3 rounded-xl border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-200">
          {watcher.error === OPEN_IN_TAB_MESSAGE ? (
            <div className="flex items-center gap-2">
              <span className="flex-1">The side panel can&apos;t share your screen. Open me in a tab to watch.</span>
              <button className={btnSecondary} onClick={watcher.openInTab}>
                Open in tab
              </button>
            </div>
          ) : (
            watcher.error
          )}
        </div>
      )}
    </section>
  );
}
