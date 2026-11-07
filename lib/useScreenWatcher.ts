"use client";
// Watch mode: keeps one screen share open, sends the last 2 frames to /api/watch
// every 10 s (5 s in demo mode). "Stuck" means a coding/problem screen with no visible
// progress for STUCK_AFTER_MS (45 s in demo mode); then it offers a hint.
// Distraction is two-stage (displayStatus): under 15 s off task nothing changes,
// 15-45 s is "suspicious" (side-eye), 45 s+ is "distracted" (no-free-reps). Demo: 5 s / 15 s.
import { useCallback, useEffect, useRef, useState } from "react";
import { watch, type MascotPose, type WatchStatus } from "./api";
import { captureVideoFrame } from "./image";

export const WATCH_INTERVAL_MS = 10_000;
export const DEMO_INTERVAL_MS = 5_000;
/** No visible progress on a coding/problem screen for this long counts as stuck. */
export const STUCK_AFTER_MS = 15 * 60_000;
export const DEMO_STUCK_AFTER_MS = 45_000;
const STUCK_LINE = "Form looks frozen, bro. Need a spot?";
/** Off task this long: "suspicious" (side-eye). */
export const SUSPICIOUS_AFTER_MS = 15_000;
export const DEMO_SUSPICIOUS_AFTER_MS = 5_000;
/** Off task this long: "distracted" (no-free-reps). */
export const DISTRACTED_AFTER_MS = 45_000;
export const DEMO_DISTRACTED_AFTER_MS = 15_000;
function escalatedLine(ms: number): string {
  return `${formatDuration(ms)} off task? That's skipping leg day. Back to the bar.`;
}
export const OPEN_IN_TAB_MESSAGE = "Open Spotter in a tab to use watch mode";

export interface ScreenWatcherOptions {
  /** Title of the loaded problem, sent with each frame so the model knows what "on task" means. */
  problemTitle?: string;
  /** Initial demo mode (5 s interval instead of 10 s, shorter thresholds). */
  demoMode?: boolean;
}

/** What the UI shows: WatchStatus plus "suspicious" (UI only, not in the contract). */
export type DisplayStatus = WatchStatus | "suspicious";

export interface ScreenWatcher {
  /** Latest raw status from the checks (with "stuck" decided here), or null before the first result. */
  status: WatchStatus | null;
  /**
   * Status to show in pills: like status, but distraction is staged. Under 15 s off task it
   * keeps the previous value, 15-45 s is "suspicious", 45 s+ is "distracted" (5 s / 15 s in demo).
   */
  displayStatus: DisplayStatus | null;
  reason: string;
  mascotLine: string;
  pose: MascotPose;
  /** True once stuck (no progress for 15 min, 45 s in demo mode). Reset with dismissOffer() or stop(). */
  offerHint: boolean;
  dismissOffer: () => void;
  isWatching: boolean;
  /** Call directly from a click handler (calls getDisplayMedia synchronously). */
  start: () => void;
  stop: () => void;
  demoMode: boolean;
  setDemoMode: (on: boolean) => void;
  /** Friendly error message, or null. OPEN_IN_TAB_MESSAGE when screen share is blocked in an iframe. */
  error: string | null;
  /** Opens the app in a new tab (for when watch mode is blocked in the extension side panel). */
  openInTab: () => void;
}

function formatDuration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 120 ? `${s} s` : `${Math.round(s / 60)} min`;
}

function inIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function startErrorMessage(e: unknown): string {
  const name = e instanceof DOMException ? e.name : "";
  const unsupported = typeof navigator === "undefined" || !navigator.mediaDevices?.getDisplayMedia;
  // Inside an iframe without display-capture permission (e.g. the extension side panel),
  // getDisplayMedia is missing or rejects with NotAllowedError right away.
  if (inIframe() && (unsupported || name === "NotAllowedError" || name === "SecurityError"))
    return OPEN_IN_TAB_MESSAGE;
  if (unsupported) return "This browser can't share the screen.";
  if (name === "NotAllowedError") return "Screen share was cancelled or blocked. Click Start watching and pick a screen.";
  if (name === "NotFoundError") return "No screen or window was available to share.";
  return "Couldn't start screen sharing. Try again.";
}

export function useScreenWatcher(options: ScreenWatcherOptions = {}): ScreenWatcher {
  const [status, setStatus] = useState<WatchStatus | null>(null);
  const [displayStatus, setDisplayStatus] = useState<DisplayStatus | null>(null);
  const [reason, setReason] = useState("");
  const [mascotLine, setMascotLine] = useState("");
  const [pose, setPose] = useState<MascotPose>("idle");
  const [offerHint, setOfferHint] = useState(false);
  const [isWatching, setIsWatching] = useState(false);
  const [demoMode, setDemoMode] = useState(options.demoMode ?? false);
  const [error, setError] = useState<string | null>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const framesRef = useRef<string[]>([]);
  const busyRef = useRef(false);
  const lastProgressAtRef = useRef(0); // last time the screen showed progress
  const offeredRef = useRef(false); // already offered a hint in the current stuck stretch
  const distractedSinceRef = useRef<number | null>(null); // first "distracted" in the current stretch
  const demoRef = useRef(options.demoMode ?? false);
  const sessionRef = useRef(0); // bumps on start/stop so late responses are ignored
  const titleRef = useRef(options.problemTitle);
  useEffect(() => {
    titleRef.current = options.problemTitle;
    demoRef.current = demoMode;
  });

  const teardown = useCallback(() => {
    sessionRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    videoRef.current = null;
    framesRef.current = [];
    busyRef.current = false;
    lastProgressAtRef.current = Date.now(); // starting (or stopping) resets the stuck clock
    offeredRef.current = false;
    distractedSinceRef.current = null;
  }, []);

  const stop = useCallback(() => {
    teardown();
    setIsWatching(false);
    setOfferHint(false);
  }, [teardown]);

  const tick = useCallback(async () => {
    const video = videoRef.current;
    if (!video || busyRef.current || !video.videoWidth) return; // skip if a request is in flight
    let frame: string;
    try {
      frame = captureVideoFrame(video);
    } catch {
      return;
    }
    framesRef.current = [...framesRef.current, frame].slice(-2);
    busyRef.current = true;
    const session = sessionRef.current;
    try {
      const res = await watch({ frames_base64: framesRef.current, problem_title: titleRef.current });
      if (session !== sessionRef.current) return;
      const now = Date.now();
      // Progress, or a break from the problem, restarts the stuck clock.
      // A failed or unknown check neither restarts it nor counts as stuck.
      if (res.ok && (res.changed || res.status === "distracted" || res.status === "idle")) {
        lastProgressAtRef.current = now;
        offeredRef.current = false;
      }
      // Distraction clock: starts on the first "distracted", cleared when back on task
      // (focused, stuck or idle). Failed or unknown checks leave it alone.
      if (res.ok && res.status === "distracted") distractedSinceRef.current ??= now;
      else if (res.ok && res.status !== "unknown") distractedSinceRef.current = null;

      if (res.ok && res.status === "distracted") {
        setStatus("distracted");
        const offFor = now - (distractedSinceRef.current ?? now);
        const demo = demoRef.current;
        if (offFor >= (demo ? DEMO_DISTRACTED_AFTER_MS : DISTRACTED_AFTER_MS)) {
          setDisplayStatus("distracted");
          setReason(res.reason);
          setMascotLine(escalatedLine(offFor));
          setPose("no-free-reps");
        } else if (offFor >= (demo ? DEMO_SUSPICIOUS_AFTER_MS : SUSPICIOUS_AFTER_MS)) {
          setDisplayStatus("suspicious");
          setReason(res.reason);
          setMascotLine(res.mascot_line);
          setPose("side-eye");
        }
        // Under the first threshold: keep showing whatever was there (benefit of the doubt).
        return;
      }

      const stuckAfter = demoRef.current ? DEMO_STUCK_AFTER_MS : STUCK_AFTER_MS;
      const frozenFor = now - lastProgressAtRef.current;
      if (res.ok && res.status === "focused" && frozenFor >= stuckAfter) {
        setStatus("stuck");
        setDisplayStatus("stuck");
        setReason(`No visible progress for ${formatDuration(frozenFor)}.`);
        setMascotLine(STUCK_LINE);
        setPose("spotting");
        if (!offeredRef.current) {
          offeredRef.current = true;
          setOfferHint(true);
        }
        return;
      }
      // Only the clock above decides stuck; never pass a server "stuck" through.
      const next: WatchStatus = res.status === "stuck" ? "focused" : res.status;
      setStatus(next);
      setDisplayStatus(next);
      setReason(res.reason);
      setMascotLine(res.mascot_line);
      setPose(res.pose);
    } catch {
      if (session !== sessionRef.current) return;
      setStatus("unknown");
      setDisplayStatus("unknown");
      setReason("Couldn't reach the coach. Retrying next check.");
    } finally {
      if (session === sessionRef.current) busyRef.current = false;
    }
  }, []);

  const start = useCallback(() => {
    if (streamRef.current) return;
    setError(null);
    // Must run synchronously inside the click handler (Firefox user-gesture rule).
    let streamPromise: Promise<MediaStream>;
    try {
      streamPromise = navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    } catch (e) {
      setError(startErrorMessage(e));
      return;
    }
    teardown();
    const session = sessionRef.current;
    streamPromise
      .then(async (stream) => {
        if (session !== sessionRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        // User clicked "Stop sharing" in the browser bar.
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (streamRef.current === stream) stop();
        });
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.srcObject = stream;
        videoRef.current = video;
        await video.play();
        if (session !== sessionRef.current) return;
        setIsWatching(true);
        lastProgressAtRef.current = Date.now(); // the stuck clock starts when sharing does
        setOfferHint(false);
        setStatus(null);
        setDisplayStatus(null);
        setReason("");
        setMascotLine("I'm watching. Lift.");
        setPose("idle");
        // First check shortly after sharing starts, then on the interval.
        setTimeout(() => {
          if (session === sessionRef.current) void tick();
        }, 1000);
      })
      .catch((e) => {
        if (session !== sessionRef.current) return;
        teardown();
        setIsWatching(false);
        setError(startErrorMessage(e));
      });
  }, [teardown, stop, tick]);

  useEffect(() => {
    if (!isWatching) return;
    const id = setInterval(() => void tick(), demoMode ? DEMO_INTERVAL_MS : WATCH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isWatching, demoMode, tick]);

  // Release the screen share on unmount.
  useEffect(() => teardown, [teardown]);

  const dismissOffer = useCallback(() => setOfferHint(false), []);

  const openInTab = useCallback(() => {
    window.open(window.location.href, "_blank", "noopener");
  }, []);

  return {
    status,
    displayStatus,
    reason,
    mascotLine,
    pose,
    offerHint,
    dismissOffer,
    isWatching,
    start,
    stop,
    demoMode,
    setDemoMode,
    error,
    openInTab,
  };
}
