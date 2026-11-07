import type { Rung, WatchStatus } from "@/lib/api";

// Shared class strings for the sticker look: ink borders, small radius, hard offset shadows.
// Buttons press down onto their shadow when clicked.
const press =
  "transition-transform hover:-translate-y-0.5 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:active:translate-x-0 disabled:active:translate-y-0 disabled:active:shadow-hard-sm";

export const sticker = "rounded-ui border-4 border-ink bg-white shadow-hard";
export const btnPrimary = `rounded-ui border-4 border-ink bg-mint text-ink shadow-hard ${press}`;
export const btnSecondary = `rounded-ui border-2 border-ink bg-white px-3 py-2 text-sm font-black uppercase tracking-tight text-ink shadow-hard-sm ${press}`;
export const btnTag = `rounded-ui border-2 border-ink bg-white px-2.5 py-1.5 font-mono text-[10px] font-black uppercase tracking-wider text-ink shadow-hard-sm ${press}`;
export const input =
  "w-full rounded-ui border-4 border-ink bg-white px-3 py-2 text-sm font-medium text-ink shadow-hard placeholder:text-slate/70 focus:outline-none focus-visible:bg-mint-soft disabled:opacity-50";
export const label = "font-mono text-[10px] font-bold uppercase tracking-widest text-slate";
export const heading = "font-black uppercase tracking-tight";
export const divider = "border-t-2 border-dashed border-ink/30";

/** Plate colour and readable tag text for each step: green, yellow, blue, red. */
export const PLATE: Record<Rung, { bg: string; text: string }> = {
  1: { bg: "bg-plate-green", text: "text-ink" },
  2: { bg: "bg-plate-yellow", text: "text-ink" },
  3: { bg: "bg-plate-blue", text: "text-white" },
  4: { bg: "bg-plate-red", text: "text-white" },
};

export const STEP_LABEL: Record<Rung, string> = {
  1: "An observation",
  2: "The technique",
  3: "The approach",
  4: "Pseudocode",
};

export const STATUS: Record<WatchStatus, { label: string; pill: string }> = {
  focused: { label: "Focused", pill: "bg-plate-green text-ink" },
  stuck: { label: "Stuck", pill: "bg-plate-yellow text-ink" },
  distracted: { label: "Distracted", pill: "bg-plate-red text-white" },
  idle: { label: "Idle", pill: "bg-plate-grey text-ink" },
  unknown: { label: "Unsure", pill: "bg-plate-grey text-ink" },
};

// Used by the /install page, which keeps its own look for now.
export const card =
  "rounded-2xl border border-[#24345f] bg-[#111c3d] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.35)]";
export const cardTitle = "text-xs font-bold uppercase tracking-[0.16em] text-[#5eead4]";
export const muted = "text-sm text-[#9aa0a6]";
