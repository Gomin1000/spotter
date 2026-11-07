"use client";
// Watch mode: keeps one screen share open, sends the last 2 frames to /api/watch
// every 20 s (5 s in demo mode), and offers a hint after 3 "stuck" results in a row.
import { useCallback, useEffect, useRef, useState } from "react";
import { watch, type MascotPose, type WatchStatus } from "./api";
import { captureVideoFrame } from "./image";

export const WATCH_INTERVAL_MS = 20_000;
export const DEMO_INTERVAL_MS = 5_000;
export const STUCK_TO_OFFER = 3;
export const OPEN_IN_TAB_MESSAGE = "Open Spotter in a tab to use watch mode";

export interface ScreenWatcherOptions {
  /** Title of the loaded problem, sent with each frame so the model knows what "on task" means. */
  problemTitle?: string;
  /** Initial demo mode (5 s interval instead of 20 s). */
  demoMode?: boolean;
}

export interface ScreenWatcher {
  /** Latest status, or null before the first result. */
  status: WatchStatus | null;
  reason: string;
  mascotLine: string;
  pose: MascotPose;
  /** True after 3 consecutive "stuck" results. Reset with dismissOffer() or stop(). */
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
  const stuckRef = useRef(0);
  const sessionRef = useRef(0); // bumps on start/stop so late responses are ignored
  const titleRef = useRef(options.problemTitle);
  useEffect(() => {
    titleRef.current = options.problemTitle;
  });

  const teardown = useCallback(() => {
    sessionRef.current++;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    videoRef.current = null;
    framesRef.current = [];
    busyRef.current = false;
    stuckRef.current = 0;
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
      setStatus(res.status);
      setReason(res.reason);
      setMascotLine(res.mascot_line);
      setPose(res.pose);
      if (!res.ok) return; // a failed check doesn't break or extend a stuck streak
      if (res.status === "stuck") {
        stuckRef.current++;
        if (stuckRef.current >= STUCK_TO_OFFER) {
          stuckRef.current = 0;
          setOfferHint(true);
        }
      } else {
        stuckRef.current = 0;
      }
    } catch {
      if (session !== sessionRef.current) return;
      setStatus("unknown");
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
        setOfferHint(false);
        setStatus(null);
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
