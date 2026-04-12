import { useEffect, useRef } from "react";
import { sfx } from "../lib/sounds";

/**
 * Play the victory or defeat sfx exactly once, the first time `winner` is set.
 * `didWin` determines which sound plays.
 */
export function useWinSound(winner: string | null, didWin: boolean): void {
  const played = useRef(false);
  useEffect(() => {
    if (!winner || played.current) return;
    played.current = true;
    if (didWin) sfx.victory();
    else sfx.defeat();
  }, [winner, didWin]);
}
