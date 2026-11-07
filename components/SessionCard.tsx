"use client";
import { DEMO_INTERVAL_MS, OPEN_IN_TAB_MESSAGE, WATCH_INTERVAL_MS, type ScreenWatcher } from "@/lib/useScreenWatcher";
import { STATUS, btnSecondary, btnTag, divider, heading, label, statusPill, sticker } from "./ui";

/** DOM id of the watch card, so the sticky strip's status pill can scroll to it. */
export const WATCH_CARD_ID = "watch-card";

interface Props {
  watcher: ScreenWatcher;
  canSpot: boolean;
  onAcceptSpot: () => void;
}

export function SessionCard({ watcher, canSpot, onAcceptSpot }: Props) {
  const status = watcher.displayStatus ? STATUS[watcher.displayStatus] : null;
  const every = `${(watcher.demoMode ? DEMO_INTERVAL_MS : WATCH_INTERVAL_MS) / 1000} s`;

  // scroll-mt clears the sticky strip (under 180 px) when the strip's pill scrolls here.
  return (
    <section id={WATCH_CARD_ID} className={`${sticker} flex scroll-mt-[196px] flex-col gap-4 p-4`}>
      <div>
        <p className={label}>Watch mode</p>
        <h2 className={`${heading} mt-1 text-xl leading-none`}>Keep me honest</h2>
      </div>

      <div className="flex flex-col gap-3">
        <Switch
          label="Watch me"
          checked={watcher.isWatching}
          // start() must run directly in the click handler, with nothing awaited first (Firefox).
          onToggle={() => (watcher.isWatching ? watcher.stop() : watcher.start())}
        />
        <Switch
          label="Demo speed"
          hint={`Every ${every}`}
          checked={watcher.demoMode}
          onToggle={() => watcher.setDemoMode(!watcher.demoMode)}
        />
      </div>

      <div className={`${divider} pt-3`} aria-live="polite">
        {watcher.isWatching ? (
          <>
            {status ? (
              <span className={`${statusPill} px-3 py-1 text-[11px] ${status.pill}`}>{status.label}</span>
            ) : (
              <p className={label}>First check coming up</p>
            )}
            {watcher.reason && <p className="mt-2 text-sm font-medium">{watcher.reason}</p>}
          </>
        ) : (
          !watcher.error && (
            <p className="text-sm font-medium text-slate">
              Share your screen and I&apos;ll check in every {every}.
            </p>
          )
        )}
      </div>

      {watcher.offerHint && (
        <div className="flex items-center gap-3 rounded-ui border-2 border-ink bg-sun p-3">
          <p className={`${heading} flex-1 text-lg leading-none`}>Want a spot?</p>
          <button
            className={btnTag}
            disabled={!canSpot}
            onClick={() => {
              watcher.dismissOffer();
              onAcceptSpot();
            }}
          >
            Spot me
          </button>
          <button className={btnTag} onClick={watcher.dismissOffer}>
            Not now
          </button>
        </div>
      )}

      {watcher.error &&
        (watcher.error === OPEN_IN_TAB_MESSAGE ? (
          <div className="flex items-center gap-3 rounded-ui border-2 border-ink bg-paper p-3">
            <p className="flex-1 text-sm font-bold">The side panel can&apos;t share your screen. Open me in a tab to watch.</p>
            <button className={btnSecondary} onClick={watcher.openInTab}>
              Open in tab
            </button>
          </div>
        ) : (
          <p className="rounded-ui border-2 border-ink bg-paper p-3 text-sm font-bold">{watcher.error}</p>
        ))}
    </section>
  );
}

function Switch({
  label: name,
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
    <button role="switch" aria-checked={checked} onClick={onToggle} className="flex items-center gap-3 text-left">
      <span
        aria-hidden
        className={`relative h-6 w-11 shrink-0 rounded-ui border-2 border-ink shadow-hard-sm ${checked ? "bg-mint" : "bg-white"}`}
      >
        <span className={`absolute top-[2px] h-4 w-4 rounded-[2px] bg-ink ${checked ? "left-[21px]" : "left-[2px]"}`} />
      </span>
      <span className="flex items-baseline gap-2">
        <span className={`${heading} text-base leading-none`}>{name}</span>
        {hint && <span className={label}>{hint}</span>}
      </span>
    </button>
  );
}
