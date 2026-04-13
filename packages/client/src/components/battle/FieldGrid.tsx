import type { FieldPosition, FieldRow, FieldCol, Field, SupportCard } from "@cards/shared";
import { getSlot, canAttack, previewCombat } from "@cards/battle-engine";
import type { CombatPreview } from "@cards/battle-engine";
import { FieldSlotView } from "../FieldSlotView";

const ROWS: FieldRow[] = ["front", "back"];
const COLS: FieldCol[] = [0, 1, 2];

interface FieldGridProps {
  field: Field;
  /** True when rendering the current player's field (bottom). */
  isOwn: boolean;
  /** True to display the field mirrored (opponent's side on top). */
  flipped: boolean;
  /** Current selected own-side attacker, if any. */
  selectedAttackerPos: FieldPosition | null;
  /** Index of selected hand card (for deploy-target highlighting). */
  selectedHandIndex: number | null;
  /** Position that was just hit, to trigger shake animation. */
  lastHitPos: FieldPosition | null;
  /**
   * The current player's own field. Used on the enemy grid to compute which
   * defender slots the selected attacker can legally reach.
   */
  ownField: Field;
  /** Own player's active supports — feeds the damage preview. */
  ownSupports: SupportCard[];
  /**
   * Opponent's active supports. Empty array in online mode (server view
   * doesn't expose them) — preview will be a slight underestimate in that
   * case but still useful.
   */
  opponentSupports: SupportCard[];
  onClick: (pos: FieldPosition) => void;
}

/**
 * The 3x2 grid of field slots for one player.
 * Coordinates every individual slot's highlight state (selected, targetable, etc.)
 * based on the selection state passed in.
 */
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
  onClick,
}: FieldGridProps) {
  const rows = flipped ? [...ROWS].reverse() : ROWS;

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row} className="flex gap-2 justify-center">
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

            // Preview on the enemy slot under the selected attacker.
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
                onClick={() => onClick(pos)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
