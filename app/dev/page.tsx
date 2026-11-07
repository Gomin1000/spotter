"use client";

import { useState } from "react";
import {
  getHint,
  getRating,
  MOCK_HINT,
  MOCK_PROBLEM,
  MOCK_READ,
  MOCK_WATCH,
  readProblem,
  RUNG_NAMES,
  watch,
  type Problem,
  type Rung,
} from "@/lib/api";
import { grabScreenOnce, resizeToJpegBase64 } from "@/lib/image";
import { usePasteImage } from "@/lib/usePasteImage";
import { useExtensionBridge } from "@/lib/useExtensionBridge";
import { OPEN_IN_TAB_MESSAGE, useScreenWatcher } from "@/lib/useScreenWatcher";

export default function DevPage() {
  const [imageB64, setImageB64] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [code, setCode] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [rung, setRung] = useState<Rung>(1);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [frames, setFrames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [output, setOutput] = useState("");
  const [pasted, setPasted] = useState<string | null>(null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const watcher = useScreenWatcher({ problemTitle: problem?.title });

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    setOutput(`${label}…`);
    const t0 = performance.now();
    try {
      const res = await fn();
      setOutput(`${label} (${Math.round(performance.now() - t0)} ms)\n${JSON.stringify(res, null, 2)}`);
    } catch (e) {
      setOutput(`${label} ERROR\n${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setImageB64(await resizeToJpegBase64(file));
    setPasted(null);
  }

  function onGrab() {
    // grabScreenOnce() must be called synchronously in the click handler (Firefox).
    const grab = grabScreenOnce();
    run("grabScreenOnce", async () => {
      const res = await grab;
      if (!res.ok) return res;
      const b64 = res.image_base64;
      setImageB64(b64);
      setFrames((f) => [...f, b64].slice(-2));
      return { captured_kb: Math.round((b64.length * 3) / 4 / 1024) };
    });
  }

  // Ctrl+V or drop a screenshot anywhere: load it and read it right away.
  usePasteImage(
    (b64, source) => {
      setImageB64(b64);
      setPasted(source === "paste" ? "Screenshot pasted" : "Screenshot dropped");
      onRead(b64);
    },
    (message) => setOutput(message),
  );

  // "Read this page" in the Chrome extension side panel.
  useExtensionBridge({
    onStart: (page) => {
      setBusy(true);
      setOutput(`extension: reading "${page.title || page.url}"…`);
    },
    onResult: (res, page) => {
      setBusy(false);
      if (res.found_problem && res.problem) {
        setProblem(res.problem);
        setHints([]);
        setRung(1);
        setLoadedFrom(page.title || page.url || res.problem.title);
      }
      setOutput(`extension: ${page.url}
${JSON.stringify(res, null, 2)}`);
    },
    onError: (message) => {
      setBusy(false);
      setOutput(`extension ERROR
${message}`);
    },
  });

  function onRead(image: string | null = imageB64) {
    run("readProblem", async () => {
      const res = await readProblem(image ? { image_base64: image } : { text });
      if (res.found_problem && res.problem) {
        setProblem(res.problem);
        setLoadedFrom(null);
        setHints([]);
      }
      return res;
    });
  }

  function onHint(r: Rung = rung) {
    run("getHint", async () => {
      const res = await getHint({
        problem: problem ?? MOCK_PROBLEM,
        rung: r,
        previous_hints: hints,
        code: code || undefined,
        user_message: userMessage || undefined,
      });
      if (res.ok && !res.refused) {
        setHints((h) => [...h, res.hint]);
        if (r < 4) setRung((r + 1) as Rung);
      }
      return res;
    });
  }

  function onRating() {
    const base = problem ?? MOCK_PROBLEM;
    run("getRating", () =>
      getRating({ problem: sourceUrl.trim() ? { ...base, source_url: sourceUrl.trim() } : base }),
    );
  }

  function onWatch() {
    run("watch", () =>
      watch({
        frames_base64: frames.length ? frames : imageB64 ? [imageB64] : [],
        problem_title: problem?.title,
      }),
    );
  }

  const box = "border border-gray-400 rounded p-2 w-full font-mono text-sm bg-transparent";
  const btn = "border border-gray-500 rounded px-3 py-1 disabled:opacity-50";

  return (
    <main className="p-6 max-w-3xl mx-auto flex flex-col gap-4">
      <h1 className="text-xl font-bold">Spotter dev page</h1>
      <p className="text-sm">
        Mocks: read={String(MOCK_READ)} hint={String(MOCK_HINT)} watch={String(MOCK_WATCH)}
      </p>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">Input</h2>
        <p className="text-sm">Tip: Win+Shift+S then Ctrl+V, or drop an image anywhere on the page.</p>
        <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2 items-center">
          <button className={btn} disabled={busy} onClick={onGrab}>Read my screen</button>
          {imageB64 && (
            <>
              <span className="text-sm">image: {Math.round((imageB64.length * 3) / 4 / 1024)} KB</span>
              <button className={btn} onClick={() => { setImageB64(null); setPasted(null); }}>Clear image</button>
            </>
          )}
          <span className="text-sm">watch frames: {frames.length}</span>
        </div>
        {imageB64 && (
          <figure className="flex flex-col gap-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/jpeg;base64,${imageB64}`} alt="captured" className="max-w-48 border" />
            {pasted && <figcaption className="text-sm">{pasted}</figcaption>}
          </figure>
        )}
        <textarea className={box} rows={4} placeholder="Or paste problem text (used when no image)" value={text} onChange={(e) => setText(e.target.value)} />
        <textarea className={box} rows={3} placeholder="Optional code" value={code} onChange={(e) => setCode(e.target.value)} />
        <input className={box} placeholder="Optional user message (try: just give me the answer)" value={userMessage} onChange={(e) => setUserMessage(e.target.value)} />
        <label className="text-sm">
          Rung:{" "}
          <select className="border rounded bg-transparent" value={rung} onChange={(e) => setRung(Number(e.target.value) as Rung)}>
            {([1, 2, 3, 4] as Rung[]).map((r) => (
              <option key={r} value={r}>{r} {RUNG_NAMES[r]}</option>
            ))}
          </select>
        </label>
      </section>

      <section className="flex gap-2">
        <button className={btn} disabled={busy} onClick={() => onRead()}>readProblem()</button>
        <button className={btn} disabled={busy} onClick={() => onHint()}>getHint()</button>
        <button className={btn} disabled={busy} onClick={onWatch}>watch()</button>
        <button className={btn} disabled={busy} onClick={onRating}>Reveal weight</button>
      </section>
      <input
        className={box}
        placeholder={`Optional source URL for Reveal weight${problem?.source_url ? ` (problem has ${problem.source_url})` : ""}, e.g. https://codeforces.com/problemset/problem/4/A`}
        value={sourceUrl}
        onChange={(e) => setSourceUrl(e.target.value)}
      />

      <section className="flex flex-col gap-2 border rounded p-3">
        <h2 className="font-semibold">Watch mode (useScreenWatcher)</h2>
        <div className="flex gap-2 items-center">
          {watcher.isWatching ? (
            <button className={btn} onClick={watcher.stop}>Stop</button>
          ) : (
            <button className={btn} onClick={watcher.start}>Start watching</button>
          )}
          <label className="text-sm flex gap-1 items-center">
            <input type="checkbox" checked={watcher.demoMode} onChange={(e) => watcher.setDemoMode(e.target.checked)} />
            Demo mode (5 s instead of 20 s)
          </label>
        </div>
        <p className="text-sm font-mono">
          watching={String(watcher.isWatching)} status={watcher.status ?? "-"} pose={watcher.pose} offerHint={String(watcher.offerHint)}
        </p>
        {watcher.reason && <p className="text-sm">reason: {watcher.reason}</p>}
        {watcher.mascotLine && <p className="text-sm font-semibold">Spotter: “{watcher.mascotLine}”</p>}
        {watcher.offerHint && (
          <div className="flex gap-2 items-center text-sm">
            Stuck 3 checks in a row. Want rung 1?
            <button className={btn} disabled={busy} onClick={() => { watcher.dismissOffer(); onHint(1); }}>Spot me</button>
            <button className={btn} onClick={watcher.dismissOffer}>Dismiss</button>
          </div>
        )}
        {watcher.error && (
          <p className="text-sm text-red-600">
            {watcher.error}{" "}
            {watcher.error === OPEN_IN_TAB_MESSAGE && (
              <button className={btn} onClick={watcher.openInTab}>Open in tab</button>
            )}
          </p>
        )}
      </section>

      <p className="text-sm">
        Problem: {problem ? problem.title : "(none, getHint uses MOCK_PROBLEM)"} · hints so far: {hints.length}
      </p>
      {loadedFrom && (
        <p className="text-sm font-semibold text-green-600">Loaded from page: {loadedFrom}</p>
      )}

      <pre className="border rounded p-3 text-xs whitespace-pre-wrap min-h-32">{output}</pre>
    </main>
  );
}
