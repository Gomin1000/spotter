"use client";

import { useState } from "react";
import {
  getHint,
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

  function onRead() {
    run("readProblem", async () => {
      const res = await readProblem(imageB64 ? { image_base64: imageB64 } : { text });
      if (res.found_problem && res.problem) {
        setProblem(res.problem);
        setHints([]);
      }
      return res;
    });
  }

  function onHint() {
    run("getHint", async () => {
      const res = await getHint({
        problem: problem ?? MOCK_PROBLEM,
        rung,
        previous_hints: hints,
        code: code || undefined,
        user_message: userMessage || undefined,
      });
      if (res.ok && !res.refused) {
        setHints((h) => [...h, res.hint]);
        if (rung < 4) setRung((rung + 1) as Rung);
      }
      return res;
    });
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
        <input type="file" accept="image/*" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex gap-2 items-center">
          <button className={btn} disabled={busy} onClick={onGrab}>Read my screen</button>
          {imageB64 && (
            <>
              <span className="text-sm">image: {Math.round((imageB64.length * 3) / 4 / 1024)} KB</span>
              <button className={btn} onClick={() => setImageB64(null)}>Clear image</button>
            </>
          )}
          <span className="text-sm">watch frames: {frames.length}</span>
        </div>
        {imageB64 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`data:image/jpeg;base64,${imageB64}`} alt="captured" className="max-w-xs border" />
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
        <button className={btn} disabled={busy} onClick={onRead}>readProblem()</button>
        <button className={btn} disabled={busy} onClick={onHint}>getHint()</button>
        <button className={btn} disabled={busy} onClick={onWatch}>watch()</button>
      </section>

      <p className="text-sm">
        Problem: {problem ? problem.title : "(none, getHint uses MOCK_PROBLEM)"} · hints so far: {hints.length}
      </p>

      <pre className="border rounded p-3 text-xs whitespace-pre-wrap min-h-32">{output}</pre>
    </main>
  );
}
