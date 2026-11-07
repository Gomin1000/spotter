"use client";
import { OPEN_IN_TAB_MESSAGE, type ScreenWatcher } from "@/lib/useScreenWatcher";
import { STATUS, btnOutline, btnText, muted } from "./ui";

interface Props {
  watcher: ScreenWatcher;
  canSpot: boolean;
  onAcceptSpot: () => void;
}

export function SessionCard({ watcher, canSpot, onAcceptSpot }: Props) {
  const status = watcher.status ? STATUS[watcher.status] : null;

  return (
    <section className="flex flex-col gap-4 border-t border-dust/20 pt-6">
      <div className="flex flex-col gap-3">
        <Switch
          label="Watch me"
          checked={watcher.isWatching}
          // start() must run directly in the click handler, with nothing awaited first (Firefox).
          onToggle={() => (watcher.isWatching ? watcher.stop() : watcher.start())}
        />
        <Switch
          label="Demo speed"
          hint={watcher.demoMode ? "Checking every 5 s" : "Checking every 20 s"}
          checked={watcher.demoMode}
          onToggle={() => watcher.setDemoMode(!watcher.demoMode)}
        />
      </div>

      {watcher.isWatching ? (
        <div aria-live="polite">
          {status ? (
            <p className="flex items-center gap-2 font-display text-xl font-semibold">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${status.dot}`} />
              {status.label}
            </p>
          ) : (
            <p className={muted}>First check coming up.</p>
          )}
          {watcher.reason && <p className={`${muted} mt-0.5`}>{watcher.reason}</p>}
        </div>
      ) : (
        !watcher.error && (
          <p className={muted}>Share your screen and I&apos;ll check in every {watcher.demoMode ? "5" : "20"} s.</p>
        )
      )}

      {watcher.offerHint && (
        <div className="flex items-center gap-4">
          <p className="flex-1 font-display text-xl font-semibold">Want a spot?</p>
          <button
            className={btnOutline}
            disabled={!canSpot}
            onClick={() => {
              watcher.dismissOffer();
              onAcceptSpot();
            }}
          >
            Spot me
          </button>
          <button className={btnText} onClick={watcher.dismissOffer}>
            Not now
          </button>
        </div>
      )}

      {watcher.error &&
        (watcher.error === OPEN_IN_TAB_MESSAGE ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-sm">The side panel can&apos;t share your screen. Open me in a tab to watch.</p>
            <button className={btnOutline} onClick={watcher.openInTab}>
              Open in tab
            </button>
          </div>
        ) : (
          <p className="text-sm">{watcher.error}</p>
        ))}
    </section>
  );
}

function Switch({
  label,
  hint,
  checked,
  onToggle,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button role="switch" aria-checked={checked} onClick={onToggle} className="group flex items-center gap-3 text-left">
      <span
        aria-hidden
        className={`relative h-5 w-9 shrink-0 rounded-ui ${checked ? "bg-chalk" : "bg-mat"}`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-[4px] ${
            checked ? "left-[18px] bg-rubber" : "left-0.5 bg-dust"
          }`}
        />
      </span>
      <span className="flex flex-col">
        <span className="text-[15px] font-medium">{label}</span>
        {hint && <span className="text-[13px] text-dust">{hint}</span>}
      </span>
    </button>
  );
}
