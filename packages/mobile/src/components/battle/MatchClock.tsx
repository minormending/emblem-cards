import { useEffect, useRef, useState } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useGameStore } from '../../store/gameStore';

/**
 * Elapsed battle time. Resets at turn 1 (which fires on game start and on
 * rematch), pauses when a winner is set. No persistence — if the user resumes
 * a saved game the clock starts fresh; it's a comfort timer, not authoritative.
 */
export function MatchClock() {
  const turnNumber = useGameStore((s) =>
    s.gameState?.turnNumber ?? s.gameView?.turnNumber ?? 0,
  );
  const winner = useGameStore((s) =>
    s.gameState?.winner ?? s.gameView?.winner ?? null,
  );

  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    // Turn 1 marks a fresh game (fires on createGame + drawPhase).
    if (turnNumber === 1 && startedAt.current === null) {
      startedAt.current = Date.now();
      setElapsed(0);
    }
    if (turnNumber === 0) {
      startedAt.current = null;
      setElapsed(0);
    }
  }, [turnNumber]);

  useEffect(() => {
    if (winner || startedAt.current === null) return;
    const id = setInterval(() => {
      if (startedAt.current !== null) {
        setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [winner, turnNumber]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  return <Text style={styles.text}>{label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontFamily: 'Menlo',
    letterSpacing: 0.5,
  },
});
