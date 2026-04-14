import { View, StyleSheet } from 'react-native';
import type {
  FieldPosition,
  FieldRow,
  FieldCol,
  Field,
  SupportCard,
} from '@cards/shared';
import { getSlot, canAttack, previewCombat } from '@cards/battle-engine';
import type { CombatPreview } from '@cards/battle-engine';
import { FieldSlotView } from '../FieldSlotView';

const ROWS: FieldRow[] = ['front', 'back'];
const COLS: FieldCol[] = [0, 1, 2];

interface FieldGridProps {
  field: Field;
  isOwn: boolean;
  flipped: boolean;
  selectedAttackerPos: FieldPosition | null;
  selectedHandIndex: number | null;
  lastHitPos: FieldPosition | null;
  ownField: Field;
  ownSupports: SupportCard[];
  opponentSupports: SupportCard[];
  onSlotPress: (pos: FieldPosition) => void;
  slotSize?: { width: number; height: number };
}

export function FieldGrid({
  field,
  isOwn,
  flipped,
  selectedAttackerPos,
  selectedHandIndex,
  lastHitPos,
  ownField,
  ownSupports,
  opponentSupports,
  onSlotPress,
  slotSize,
}: FieldGridProps) {
  const rows = flipped ? [...ROWS].reverse() : ROWS;
  return (
    <View style={styles.grid}>
      {rows.map((row) => (
        <View key={row} style={styles.row}>
          {COLS.map((col) => {
            const pos: FieldPosition = { row, col };
            const slot = getSlot(field, pos);
            const isSelected =
              isOwn &&
              selectedAttackerPos?.row === row &&
              selectedAttackerPos?.col === col;
            const isDeployTarget = isOwn && selectedHandIndex !== null;
            const reachable =
              !isOwn &&
              selectedAttackerPos !== null &&
              slot.unit !== null &&
              canAttack(ownField, selectedAttackerPos, field, pos);
            const isAttackTarget = reachable;
            const wasHit =
              !isOwn && lastHitPos?.row === row && lastHitPos?.col === col;
            let attackPreview: CombatPreview | null = null;
            if (reachable && selectedAttackerPos) {
              attackPreview = previewCombat(
                ownField,
                selectedAttackerPos,
                field,
                pos,
                ownSupports,
                opponentSupports,
              );
            }
            return (
              <FieldSlotView
                key={`${row}-${col}`}
                slot={slot}
                pos={pos}
                isOwn={isOwn}
                isSelected={isSelected}
                isDeployTarget={isDeployTarget}
                isAttackTarget={isAttackTarget}
                lastHit={wasHit}
                attackPreview={attackPreview}
                onPress={() => onSlotPress(pos)}
                size={slotSize}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
});
