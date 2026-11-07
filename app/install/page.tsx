import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/CopyText";
import { btnPrimary, btnTag, divider, heading, label, sticker } from "@/components/ui";

export const metadata: Metadata = {
  title: "Install Spotter for Chrome",
  description: "Load the Spotter extension unpacked and dock it beside your problem.",
};

const STEP_TAG = ["bg-plate-green text-ink", "bg-plate-yellow text-ink", "bg-plate-blue text-white", "bg-plate-red text-white"];
const code = "rounded-ui border-2 border-ink bg-paper px-1 font-mono text-[13px] font-bold";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className={`${sticker} p-4`}>
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

export default function InstallPage() {
  return (
    <div className="min-h-screen w-full bg-paper text-ink">
      <header className="border-b-4 border-ink bg-mint">
        <div className="mx-auto flex max-w-[560px] items-end justify-between gap-3 px-4 pb-4 pt-6">
          <Link href="/" className="block">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em]">Competitive programming</p>
            <p className="text-[34px] font-black uppercase leading-[0.88] tracking-[-0.055em]">Spotter</p>
          </Link>
          <Link href="/" className={btnTag}>
            Open Spotter
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-4 pb-14 pt-8">
        <section className="flex flex-col gap-4">
          <p className={label}>Chrome extension</p>
          <h1 className="text-[40px] font-black uppercase leading-[0.9] tracking-[-0.04em]">
            Dock Spotter beside your problem.
          </h1>
          <p className="border-l-4 border-ink pl-4 text-base font-bold leading-snug">
            It opens in Chrome&apos;s side panel and reads the problem for you. It spots you. It never lifts for you.
          </p>
          <a
            href="/spotter-extension.zip"
            download
            className={`${btnPrimary} mt-2 flex flex-col items-center px-5 py-4 text-center`}
          >
            <span className={`${heading} text-2xl leading-none`}>Download for Chrome</span>
            <span className="mt-1.5 font-mono text-[10px] font-bold uppercase tracking-widest">
              spotter-extension.zip
            </span>
          </a>
        </section>

        <section className="flex flex-col gap-4">
          <p className={label}>Install in 4 steps</p>
          <ol className="flex flex-col gap-5">
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
        </section>

        <section className={`${sticker} bg-sun p-4`}>
          <h2 className={`${heading} text-lg leading-none`}>No extension? No problem.</h2>
          <p className="mt-2 text-[15px] font-medium leading-relaxed">
            The website works on its own: open{" "}
            <Link href="/" className="font-black underline underline-offset-2">
              Spotter
            </Link>{" "}
            and paste a screenshot (Ctrl+V) or the problem text.
          </p>
        </section>
      </main>
    </div>
  );
}
