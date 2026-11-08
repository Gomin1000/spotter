import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/CopyText";
import { btnPrimary, btnSecondary, btnTag, divider, heading, label, sticker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Spotter: your competitive-programming spotter",
  description:
    "A Chrome side-panel sidekick for LeetCode and Codeforces. Hints one rung at a time, honest code checks, never the solution.",
};

const STEP_TAG = ["bg-plate-green text-ink", "bg-plate-yellow text-ink", "bg-plate-blue text-white", "bg-plate-red text-white"];
const code = "rounded-ui border-2 border-ink bg-paper px-1 font-mono text-[13px] font-bold";

/** One install step. The <li> is the card itself (border and offset shadow), so h-full plus a
 *  shared min-height keeps all four the same height in the stretched grid. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className={`${sticker} flex h-full min-h-[248px] flex-col p-4`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={`shrink-0 rounded-ui border-2 border-ink px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest ${STEP_TAG[n - 1]}`}
        >
          0{n}
        </span>
        <h3 className={`${heading} text-xl leading-none`}>
          <span className="sr-only">Step {n}: </span>
          {title}
        </h3>
      </div>
      <div className={`${divider} mt-3 flex flex-col gap-2.5 pt-3 text-[15px] font-medium leading-relaxed`}>{children}</div>
    </li>
  );
}

const FEATURES: { tag: string; title: string; body: string }[] = [
  {
    tag: "bg-mint text-ink",
    title: "Lives in Chrome's side panel",
    body: "Docked beside the problem, so you never switch tabs to ask for help.",
  },
  {
    tag: "bg-sun text-ink",
    title: "One-click read",
    body: "On LeetCode and Codeforces, one click reads the problem straight off the page.",
  },
  {
    tag: "bg-plate-blue text-white",
    title: "A 4-step hint ladder",
    body: "Observation, technique, approach, pseudocode. One step per press, and BUFF-JEPI counts your reps.",
  },
  {
    tag: "bg-plate-red text-white",
    title: "No free reps",
    body: "It never gives the solution. Beg for the answer and it says no.",
  },
  {
    tag: "bg-plate-green text-white",
    title: "Honest code checks",
    body: "Paste your attempt. It only calls a bug if it can show you a failing input.",
  },
  {
    tag: "bg-coral text-ink",
    title: "Watch mode",
    body: "Wander off and you get side-eye, then anger, then it drags you back to the problem.",
  },
];

const container = "mx-auto w-full max-w-[1040px] px-4 sm:px-6";

export default function InstallPage() {
  return (
    <div className="min-h-screen w-full bg-paper text-ink">
      <header className="border-b-4 border-ink bg-mint">
        <div className={`${container} flex flex-col gap-6 py-8 sm:py-12 md:flex-row md:items-center md:justify-between md:gap-10`}>
          <div className="flex min-w-0 flex-col gap-5">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em]">
              Competitive programming sidekick
            </p>
            <h1 className="text-[56px] font-black uppercase leading-[0.85] tracking-[-0.055em] sm:text-[88px]">Spotter</h1>
            <p className="max-w-[440px] border-l-4 border-ink pl-4 text-lg font-bold leading-snug sm:text-xl">
              It spots you.
              <br />
              It never lifts for you.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <a
                href="/spotter-extension.zip"
                download
                className={`${btnPrimary} flex flex-col items-center bg-white px-6 py-4 text-center`}
              >
                <span className={`${heading} text-2xl leading-none`}>Download for Chrome</span>
                <span className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-widest">
                  spotter-extension.zip
                </span>
              </a>
              <Link href="/" className={`${btnSecondary} flex items-center justify-center px-5 py-3 text-center`}>
                Try it in your browser
              </Link>
            </div>
          </div>

          <figure className="mx-auto w-full max-w-[260px] shrink-0 sm:max-w-[320px] md:mx-0">
            <div className="aspect-square overflow-hidden rounded-ui border-4 border-ink bg-[#e2efd6] shadow-hard">
              {/* eslint-disable-next-line @next/next/no-img-element -- plain img, like the app's mascot tile */}
              <img src="/mascot/flex.png" alt="BUFF-JEPI, the Spotter robot, flexing" className="h-full w-full object-cover" />
            </div>
            <figcaption className="mt-3 text-center font-mono text-[10px] font-black uppercase tracking-widest">
              BUFF-JEPI / your spotter
            </figcaption>
          </figure>
        </div>
      </header>

      <main className={`${container} flex flex-col gap-14 pb-14 pt-10 sm:pt-14`}>
        <section className="flex flex-col gap-5" aria-labelledby="what">
          <div>
            <p className={label}>What it does</p>
            <h2 id="what" className={`${heading} mt-1 text-3xl leading-none sm:text-4xl`}>
              A spotter, not a cheat sheet
            </h2>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f, i) => (
              <li key={f.title} className={`${sticker} flex flex-col p-4`}>
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className={`shrink-0 rounded-ui border-2 border-ink px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest ${f.tag}`}
                  >
                    0{i + 1}
                  </span>
                  <h3 className={`${heading} text-xl leading-none`}>{f.title}</h3>
                </div>
                <p className={`${divider} mt-3 pt-3 text-[15px] font-medium leading-relaxed`}>{f.body}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="flex flex-col gap-5" aria-labelledby="install">
          <div>
            <p className={label}>Chrome extension</p>
            <h2 id="install" className={`${heading} mt-1 text-3xl leading-none sm:text-4xl`}>
              Install in 1 minute
            </h2>
          </div>
          <ol className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-2">
            <Step n={1} title="Unzip">
              <p>
                Unzip <code className={code}>spotter-extension.zip</code> into a folder you&apos;ll keep.
              </p>
            </Step>
            <Step n={2} title="Developer mode">
              <p>Open this in a new tab, then turn on Developer mode (top right):</p>
              <div>
                <CopyText text="chrome://extensions" />
              </div>
              <p className={label}>Websites can&apos;t link to chrome:// pages, so paste it in the address bar</p>
            </Step>
            <Step n={3} title="Load unpacked">
              <p>
                Click Load unpacked and pick the unzipped folder (the one with{" "}
                <code className={code}>manifest.json</code> inside).
              </p>
            </Step>
            <Step n={4} title="Pin and read">
              <p>
                Pin Spotter from the puzzle-piece menu, open a Codeforces or LeetCode problem and click the Spotter icon.
                Then hit Read this page.
              </p>
            </Step>
          </ol>

          <div className={`${sticker} bg-sun p-4`}>
            <h3 className={`${heading} text-lg leading-none`}>No extension? No problem.</h3>
            <p className="mt-2 text-[15px] font-medium leading-relaxed">
              The website works on its own: open{" "}
              <Link href="/" className="font-black underline underline-offset-2">
                Spotter
              </Link>{" "}
              and paste a screenshot (Ctrl+V) or the problem text.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t-4 border-ink bg-white">
        <div className={`${container} flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between`}>
          <p className="max-w-[560px] text-sm font-bold leading-snug">
            Built in one day at FallHacks 2026 by Gleb and Santiago, powered by the Gemini API
          </p>
          <a
            href="https://github.com/Gomin1000/fallhacks-2026"
            target="_blank"
            rel="noreferrer"
            className={`${btnTag} self-start sm:self-auto`}
          >
            GitHub ↗
          </a>
        </div>
      </footer>
    </div>
  );
}
