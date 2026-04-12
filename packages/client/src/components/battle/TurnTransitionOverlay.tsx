import { useEffect, useRef, useState } from "react";

interface TurnTransitionOverlayProps {
  turnNumber: number;
  currentPlayerName: string;
  /** Only show the overlay when true (e.g. only in hot-seat local mode). */
  enabled: boolean;
}

const OVERLAY_MS = 1200;

/**
 * Briefly shows "Player X's Turn" when the turn counter increments.
 * Used only in hot-seat local mode where both players share one screen;
 * in AI/online modes the turn indicator in the top bar is enough.
 */
export function TurnTransitionOverlay({
  turnNumber,
  currentPlayerName,
  enabled,
}: TurnTransitionOverlayProps) {
  const prevTurnRef = useRef(turnNumber);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (turnNumber > prevTurnRef.current && turnNumber > 1) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), OVERLAY_MS);
      prevTurnRef.current = turnNumber;
      return () => clearTimeout(t);
    }
    prevTurnRef.current = turnNumber;
  }, [turnNumber, enabled]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none animate-[fadeUp_1.2s_ease-out_forwards]">
      <div className="text-3xl font-black text-white">{currentPlayerName}&apos;s Turn</div>
    </div>
  );
}
