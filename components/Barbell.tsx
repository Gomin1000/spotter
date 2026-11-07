import type { Rung } from "@/lib/api";
import { PLATE } from "./ui";

const RUNGS: Rung[] = [1, 2, 3, 4];
// Heavier plates are thicker; all share one diameter, like competition bumpers.
const THICKNESS: Record<Rung, string> = { 1: "w-[9px]", 2: "w-[11px]", 3: "w-[13px]", 4: "w-[15px]" };

/** A barbell with four plate slots per side. Each unlocked step slides its plate on, inside out. */
export function Barbell({ loaded }: { loaded: number }) {
  return (
    <div className="relative flex h-11 items-center" role="img" aria-label={`${loaded} of 4 steps unlocked`}>
      <div aria-hidden className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 bg-dust/60" />
      <Side side="left" loaded={loaded} />
      <div className="flex-1" />
      <Side side="right" loaded={loaded} />
    </div>
  );
}

function Side({ side, loaded }: { side: "left" | "right"; loaded: number }) {
  // Step 1 sits next to the collar; step 4 is the outermost plate.
  const order = side === "left" ? [...RUNGS].reverse() : RUNGS;
  const collar = <span aria-hidden className="relative h-4 w-[5px] bg-dust" />;
  return (
    <div className={`flex items-center gap-[3px] ${side === "left" ? "pl-3" : "pr-3"}`}>
      {side === "right" && collar}
      {order.map((r) => (
        <span key={r} aria-hidden className={`relative h-10 ${THICKNESS[r]} border border-dust/25`}>
          {r <= loaded && (
            <span
              className={`absolute -inset-px ${PLATE[r].bg} ${side === "left" ? "plate-in-left" : "plate-in-right"}`}
            />
          )}
        </span>
      ))}
      {side === "left" && collar}
    </div>
  );
}
