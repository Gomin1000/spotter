import type { Metadata } from "next";
import Link from "next/link";
import { CopyText } from "@/components/CopyText";
import { card, cardTitle, muted } from "@/components/ui";

export const metadata: Metadata = {
  title: "Install Spotter for Chrome",
  description: "Load the Spotter extension unpacked and dock it beside your problem.",
};

const step = "flex gap-3";
const num =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f97316] text-sm font-black text-[#1a0d02]";

export default function InstallPage() {
  return (
    <div className="min-h-screen w-full bg-[radial-gradient(ellipse_at_top,#16264f_0%,#0b1430_55%,#070d22_100%)] text-[#e6ecff]">
      <main className="mx-auto flex w-full max-w-[560px] flex-col gap-5 px-4 py-8">
        <header className="flex items-center justify-between">
          <Link href="/" className="text-xl font-black tracking-tight">
            <span className="text-[#5eead4]">Spot</span>
            <span className="text-[#f472b6]">ter</span>
          </Link>
          <Link href="/" className="text-xs font-semibold text-[#94a3c8] hover:text-white">
            ← Back to Spotter
          </Link>
        </header>

        <section className="flex flex-col gap-3">
          <h1 className="text-2xl font-black leading-tight text-white">Dock Spotter beside your problem</h1>
          <p className={muted}>
            The extension opens Spotter in Chrome&apos;s side panel and adds a <b className="text-[#e6ecff]">Read this page</b>{" "}
            button, so you never have to copy the statement.
          </p>
          <a
            href="/spotter-extension.zip"
            download
            className="mt-2 rounded-2xl bg-[#f97316] px-5 py-4 text-center text-lg font-black text-[#1a0d02] shadow-[0_4px_0_#b45309] transition hover:bg-[#fb8a3c] active:translate-y-[2px] active:shadow-none"
          >
            ⬇ Download Spotter for Chrome
          </a>
        </section>

        <section className={card}>
          <h2 className={`${cardTitle} mb-4`}>Install in 4 steps</h2>
          <ol className="flex flex-col gap-4 text-sm leading-relaxed">
            <li className={step}>
              <span className={num}>1</span>
              <p>
                <b className="text-white">Unzip</b> <code className="font-mono text-[#fbcfe8]">spotter-extension.zip</code>{" "}
                into a folder you&apos;ll keep.
              </p>
            </li>
            <li className={step}>
              <span className={num}>2</span>
              <div className="flex flex-col gap-2">
                <p>
                  Open this in a new tab, then turn on <b className="text-white">Developer mode</b> (top right):
                </p>
                <CopyText text="chrome://extensions" />
                <p className="text-xs text-[#6b7aa6]">Websites can&apos;t link to chrome:// pages, so paste it in the address bar.</p>
              </div>
            </li>
            <li className={step}>
              <span className={num}>3</span>
              <p>
                Click <b className="text-white">Load unpacked</b> and pick the unzipped folder (the one with{" "}
                <code className="font-mono text-[#fbcfe8]">manifest.json</code> inside).
              </p>
            </li>
            <li className={step}>
              <span className={num}>4</span>
              <p>
                <b className="text-white">Pin Spotter</b> from the puzzle-piece menu, open a Codeforces or LeetCode problem,
                and click the Spotter icon. Then hit <b className="text-white">Read this page</b>.
              </p>
            </li>
          </ol>
        </section>

        <section className="rounded-2xl border border-[#2dd4bf]/40 bg-[#2dd4bf]/10 p-4 text-sm text-[#d6def5]">
          <b className="text-[#5eead4]">No extension? No problem.</b> The website works on its own: open{" "}
          <Link href="/" className="font-semibold text-[#5eead4] underline">
            Spotter
          </Link>{" "}
          and paste a screenshot (Ctrl+V) or the problem text.
        </section>
      </main>
    </div>
  );
}
