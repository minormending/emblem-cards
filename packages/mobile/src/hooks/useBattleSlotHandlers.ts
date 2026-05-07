import { useCallback } from 'react';
import type { FieldPosition, Player } from '@cards/shared';
import { getSlot } from '@cards/battle-engine';
import { useGameStore } from '../store/gameStore';

interface SlotHandlers {
  handleOwnSlotClick: (pos: FieldPosition) => void;
  handleEnemySlotClick: (pos: FieldPosition) => void;
}

export function useBattleSlotHandlers(
  me: Player | null,
  isMyTurn: boolean,
): SlotHandlers {
  const store = useGameStore();
  const { selectedHandIndex, selectedAttackerPos, setSelectedAttackerPos } = store;

  const handleOwnSlotClick = useCallback(
    (pos: FieldPosition) => {
      if (!me || !isMyTurn) return;
      if (selectedHandIndex !== null) {
        store.getActions().deploy(selectedHandIndex, pos);
        return;
      }
      if (!selectedAttackerPos) {
        if (getSlot(me.field, pos).unit) setSelectedAttackerPos(pos);
        return;
      }
      const isSameSlot =
        selectedAttackerPos.row === pos.row && selectedAttackerPos.col === pos.col;
      if (isSameSlot) setSelectedAttackerPos(null);
      else if (getSlot(me.field, pos).unit) setSelectedAttackerPos(pos);
    },
    [me, isMyTurn, selectedHandIndex, selectedAttackerPos, store, setSelectedAttackerPos],
  );

  const handleEnemySlotClick = useCallback(
    (pos: FieldPosition) => {
      if (!selectedAttackerPos || !isMyTurn) return;
      store.getActions().attack(selectedAttackerPos, pos);
    },
    [selectedAttackerPos, isMyTurn, store],
  );

  return { handleOwnSlotClick, handleEnemySlotClick };
}
