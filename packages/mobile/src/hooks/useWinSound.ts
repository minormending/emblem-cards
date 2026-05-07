import { useEffect, useRef } from 'react';
import { sfx } from '../lib/sounds';

export function useWinSound(winner: string | null, didWin: boolean): void {
  const played = useRef(false);
  useEffect(() => {
    if (!winner || played.current) return;
    played.current = true;
    if (didWin) sfx.victory();
    else sfx.defeat();
  }, [winner, didWin]);
}
