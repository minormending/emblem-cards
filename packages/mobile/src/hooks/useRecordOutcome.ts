import { useEffect, useRef } from 'react';
import { recordOutcome } from '../lib/stats';

/**
 * Records a win or loss in AsyncStorage exactly once, the first time `winner`
 * transitions from null to set. Pairs with `useWinSound` — both fire on the
 * same edge; we split them so stats don't require the sound hook to be wired.
 */
export function useRecordOutcome(
  winner: string | null,
  didWin: boolean,
  mode: 'ai' | 'local' | 'online',
  turnCount: number,
): void {
  const recorded = useRef(false);
  useEffect(() => {
    if (!winner || recorded.current) return;
    recorded.current = true;
    recordOutcome(mode, didWin, turnCount);
  }, [winner, didWin, mode, turnCount]);
}
