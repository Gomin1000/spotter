import type { Rung, WatchStatus } from "@/lib/api";

// Shared class strings for the Spotter UI: flat rubber floor, chalk text, one 6 px radius.
export const btnPrimary =
  "rounded-ui bg-chalk px-4 py-2 font-medium text-rubber transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40";
export const btnOutline =
  "rounded-ui border border-dust/60 px-3 py-1.5 text-sm font-medium text-chalk transition-colors hover:border-chalk disabled:cursor-not-allowed disabled:opacity-40";
export const btnText =
  "text-sm text-dust underline-offset-4 transition-colors hover:text-chalk hover:underline disabled:cursor-not-allowed disabled:opacity-40";
export const input =
  "w-full rounded-ui bg-mat px-3 py-2 text-sm text-chalk placeholder:text-dust/70 focus:outline-none focus-visible:outline-2 focus-visible:outline-chalk disabled:opacity-50";
export const label = "text-sm text-dust";
export const muted = "text-sm text-dust";

/** Plate colour for each step: green, yellow, blue, red. */
export const PLATE: Record<Rung, { bg: string; text: string }> = {
  1: { bg: "bg-plate-green", text: "text-chalk" },
  2: { bg: "bg-plate-yellow", text: "text-rubber" },
  3: { bg: "bg-plate-blue", text: "text-chalk" },
  4: { bg: "bg-plate-red", text: "text-chalk" },
};

export const STATUS: Record<WatchStatus, { label: string; dot: string }> = {
  focused: { label: "Focused", dot: "bg-plate-green" },
  stuck: { label: "Stuck", dot: "bg-plate-yellow" },
  distracted: { label: "Distracted", dot: "bg-plate-red" },
  idle: { label: "Idle", dot: "bg-dust" },
  unknown: { label: "Unsure", dot: "bg-dust/50" },
};

// Still used by the /install page, which keeps its own look for now.
export const card =
  "rounded-2xl border border-[#24345f] bg-[#111c3d] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.35)]";
export const cardTitle = "text-xs font-bold uppercase tracking-[0.16em] text-[#5eead4]";
