import { useCallback } from "react";
import type { FieldPosition, Player } from "@cards/shared";
import { getSlot } from "@cards/battle-engine";
import { useGameStore } from "../store/gameStore";

interface SlotHandlers {
  handleOwnSlotClick: (pos: FieldPosition) => void;
  handleEnemySlotClick: (pos: FieldPosition) => void;
}

/**
 * Click handlers for the battle field.
 *
 * The hook is mode-agnostic — it dispatches through `store.getActions()`, so
 * local, AI, and online modes all work without branching here.
 *
 * Rules:
 *   - Clicking your own slot: deploy (if a hand card is selected), select an
 *     attacker (if nothing is selected), or cancel/switch selection.
 *   - Clicking an enemy slot: attack with the currently-selected attacker.
 *
 * `lastHitPos` (for the shake animation) lives on the store so both local
 * and online paths can set it uniformly.
 */
export function useBattleSlotHandlers(me: Player | null, isMyTurn: boolean): SlotHandlers {
  const store = useGameStore();
  const { selectedHandIndex, selectedAttackerPos, setSelectedAttackerPos } = store;

  const handleOwnSlotClick = useCallback(
    (pos: FieldPosition) => {
      if (!me || !isMyTurn) return;

      // Deploy the selected hand card
      if (selectedHandIndex !== null) {
        store.getActions().deploy(selectedHandIndex, pos);
        return;
      }

      // No attacker yet — select this slot's unit
      if (!selectedAttackerPos) {
        if (getSlot(me.field, pos).unit) setSelectedAttackerPos(pos);
        return;
      }

      // Clicking the already-selected attacker deselects; clicking another switches
      const isSameSlot =
        selectedAttackerPos.row === pos.row && selectedAttackerPos.col === pos.col;
      if (isSameSlot) {
        setSelectedAttackerPos(null);
      } else if (getSlot(me.field, pos).unit) {
        setSelectedAttackerPos(pos);
      }
    },
    [me, isMyTurn, selectedHandIndex, selectedAttackerPos, store, setSelectedAttackerPos]
  );

  const handleEnemySlotClick = useCallback(
    (pos: FieldPosition) => {
      if (!selectedAttackerPos || !isMyTurn) return;
      store.getActions().attack(selectedAttackerPos, pos);
    },
    [selectedAttackerPos, isMyTurn, store]
  );

  return { handleOwnSlotClick, handleEnemySlotClick };
}
