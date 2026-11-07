import type { Rung } from "@/lib/api";
import { PLATE } from "./ui";

const RUNGS: Rung[] = [1, 2, 3, 4];
// Heavier plates are thicker; all share one diameter, like competition bumpers.
const THICKNESS: Record<Rung, string> = { 1: "w-[12px]", 2: "w-[14px]", 3: "w-[16px]", 4: "w-[18px]" };

/** A barbell with four plate slots per side. Each unlocked step slides its plate on, inside out. */
export function Barbell({ loaded }: { loaded: number }) {
  return (
    <div className="relative flex h-10 items-center" role="img" aria-label={`${loaded} of 4 steps unlocked`}>
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-[9px] -translate-y-1/2 rounded-[2px] border-2 border-ink bg-white" />
      <Side side="left" loaded={loaded} />
      <div className="flex-1" />
      <Side side="right" loaded={loaded} />
    </div>
  );
}

function Side({ side, loaded }: { side: "left" | "right"; loaded: number }) {
  // Step 1 sits next to the collar; step 4 is the outermost plate.
  const order = side === "left" ? [...RUNGS].reverse() : RUNGS;
  const collar = <span aria-hidden className="relative h-4 w-[7px] rounded-[2px] border-2 border-ink bg-ink" />;
  return (
    <div className={`flex items-center gap-[2px] ${side === "left" ? "pl-3" : "pr-3"}`}>
      {side === "right" && collar}
      {order.map((r) => (
        <span key={r} aria-hidden className={`relative h-9 ${THICKNESS[r]} rounded-[2px] border-2 border-ink/20 bg-paper`}>
          {r <= loaded && (
            <span
              className={`absolute -inset-[2px] rounded-[2px] border-2 border-ink ${PLATE[r].bg} ${
                side === "left" ? "plate-in-left" : "plate-in-right"
              }`}
            />
          )}
        </span>
      ))}
      {side === "left" && collar}
    </div>
  );
}
