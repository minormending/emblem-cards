import { useEffect, useState } from "react";
import { useGameStore, getCurrentPlayer } from "../store/gameStore";
import { getOccupiedPositions } from "@cards/battle-engine";
import { hasDoneBattleHints, markBattleHintsDone } from "../lib/firstTime";

// Step definitions — each has a check that decides if this step is "active"
// (i.e., should be shown to the player right now).

interface HintStep {
  id: string;
  title: string;
  body: string;
  // Returns true if this step is still relevant given current game state
  isActive: (store: ReturnType<typeof useGameStore.getState>) => boolean;
}

const steps: HintStep[] = [
  {
    id: "deploy",
    title: "Step 1: Deploy a unit",
    body: "Click a card in your hand, then click an empty slot on your side to deploy it. Start with a unit in the front row.",
    isActive: (s) => {
      const me = getCurrentPlayer(s);
      if (!me) return false;
      return getOccupiedPositions(me.field).length === 0;
    },
  },
  {
    id: "end-turn",
    title: "Step 2: End your turn",
    body: "Units you just deployed can't attack this turn. Click End Turn (top-right) to pass. You'll draw a card and gain more energy next turn.",
    isActive: (s) => {
      if (!s.gameState) return false;
      const me = getCurrentPlayer(s);
      if (!me) return false;
      // Show only on turn 1 after you've deployed something
      return s.gameState.turnNumber === 1 && getOccupiedPositions(me.field).length >= 1;
    },
  },
  {
    id: "attack",
    title: "Step 3: Attack",
    body: "Click your unit on the field, then click an enemy unit to attack. Units can only attack once per turn.",
    isActive: (s) => {
      if (!s.gameState) return false;
      if (s.gameState.turnNumber < 2) return false;
      const me = getCurrentPlayer(s);
      if (!me) return false;
      const myUnits = getOccupiedPositions(me.field);
      if (myUnits.length === 0) return false;
      // Has unit that hasn't acted yet
      return myUnits.some((p) => !me.field[p.row][p.col].hasActed);
    },
  },
  {
    id: "inspect",
    title: "Tip: Inspect any card",
    body: "Right-click any card to see full details. Works for cards in hand, units on the field, or the opponent's units.",
    isActive: (s) => !!s.gameState && s.gameState.turnNumber >= 3,
  },
];

export function BattleHints() {
  const store = useGameStore();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [enabled] = useState(() => !hasDoneBattleHints());

  // When all steps are dismissed, mark battle hints as done permanently.
  useEffect(() => {
    if (!enabled) return;
    if (dismissed.size >= steps.length) markBattleHintsDone();
  }, [dismissed, enabled]);

  if (!enabled) return null;
  if (!store.gameState || store.gameState.winner) return null;
  // Only show hints on the human player's turn (index 0 in AI mode / local)
  if (store.mode === "ai" && store.gameState.currentPlayerIndex !== 0) return null;

  // Find the first active, non-dismissed step
  const current = steps.find(
    (step) => !dismissed.has(step.id) && step.isActive(store)
  );
  if (!current) return null;

  return (
    <div className="fixed bottom-36 left-1/2 -translate-x-1/2 z-30 max-w-md w-[90%] pointer-events-none animate-[slideUp_0.25s_ease-out]">
      <div className="pointer-events-auto bg-gradient-to-b from-blue-950 to-blue-900 border border-blue-500/40 rounded-xl px-4 py-3 shadow-xl shadow-blue-500/20">
        <div className="flex items-start gap-3">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center font-black text-white text-sm">
            ?
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-sm text-blue-200 mb-0.5">{current.title}</div>
            <div className="text-xs text-white/80 leading-relaxed">{current.body}</div>
          </div>
          <button
            onClick={() =>
              setDismissed((s) => {
                const next = new Set(s);
                next.add(current.id);
                return next;
              })
            }
            className="text-white/40 hover:text-white text-xs font-bold transition-colors flex-shrink-0"
            aria-label="Dismiss hint"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
