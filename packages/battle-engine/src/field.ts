import type {
  Field,
  FieldSlot,
  FieldPosition,
  FieldRow,
  FieldCol,
  UnitCard,
  WeaponCard,
  AttackType,
} from "@cards/shared";

export function createEmptyField(): Field {
  const empty = (): FieldSlot => ({ unit: null, weapon: null, hasActed: false });
  return {
    front: [empty(), empty(), empty()],
    back: [empty(), empty(), empty()],
  };
}

export function getSlot(field: Field, pos: FieldPosition): FieldSlot {
  return field[pos.row][pos.col];
}

export function placeUnit(
  field: Field,
  pos: FieldPosition,
  unit: UnitCard,
  hasActed = true
): boolean {
  const slot = getSlot(field, pos);
  if (slot.unit !== null) return false;
  // Deep clone the unit so mutations (HP changes, etc.) don't leak back to
  // the card template or other instances of the same card in hand/deck.
  slot.unit = {
    ...unit,
    stats: { ...unit.stats },
    tags: [...unit.tags],
    effects: [...unit.effects],
  };
  slot.hasActed = hasActed;
  return true;
}

export function equipWeapon(
  field: Field,
  pos: FieldPosition,
  weapon: WeaponCard
): boolean {
  const slot = getSlot(field, pos);
  if (slot.unit === null) return false;
  if (!canEquip(slot.unit.attackType, weapon.attackType)) return false;
  slot.weapon = weapon;
  return true;
}

/**
 * Equip a weapon and return the previously-equipped weapon (if any) so the
 * caller can put it in the discard pile rather than losing it.
 */
export function equipWeaponAndGetOld(
  field: Field,
  pos: FieldPosition,
  weapon: WeaponCard
): { success: boolean; displaced: WeaponCard | null } {
  const slot = getSlot(field, pos);
  if (slot.unit === null) return { success: false, displaced: null };
  if (!canEquip(slot.unit.attackType, weapon.attackType)) {
    return { success: false, displaced: null };
  }
  const displaced = slot.weapon;
  slot.weapon = weapon;
  return { success: true, displaced };
}

/** Is this attack type a magical one (tome-based)? */
export function isMagicalType(t: AttackType): boolean {
  return t === "fire" || t === "wind" || t === "thunder";
}

/**
 * Compatibility rules for equipping a weapon.
 *
 *  - Magic weapons can be equipped by any magic-user unit (fire/wind/thunder),
 *    not strictly matching — a fire mage can wield a wind tome.
 *  - Physical weapons must exactly match the unit's attack type
 *    (sword→sword, axe→axe, lance→lance, bow→bow).
 *  - Cross-category (magic weapon on physical unit or vice versa) is never allowed.
 */
export function canEquip(unitType: AttackType, weaponType: AttackType): boolean {
  const unitMagical = isMagicalType(unitType);
  const weaponMagical = isMagicalType(weaponType);
  if (unitMagical !== weaponMagical) return false; // cross-category
  if (weaponMagical) return true; // any mage → any tome
  return unitType === weaponType; // physical: exact match
}

export function removeUnit(
  field: Field,
  pos: FieldPosition
): { unit: UnitCard | null; weapon: WeaponCard | null } {
  const slot = getSlot(field, pos);
  const unit = slot.unit;
  const weapon = slot.weapon;
  slot.unit = null;
  slot.weapon = null;
  slot.hasActed = false;
  return { unit, weapon };
}

/**
 * Reset hasActed for all units on a field. Called at start of a player's turn.
 */
export function resetActedFlags(field: Field): void {
  for (const row of ["front", "back"] as FieldRow[]) {
    for (const col of [0, 1, 2] as FieldCol[]) {
      field[row][col].hasActed = false;
    }
  }
}

/**
 * Returns all occupied positions on a field.
 */
export function getOccupiedPositions(field: Field): FieldPosition[] {
  const positions: FieldPosition[] = [];
  for (const row of ["front", "back"] as FieldRow[]) {
    for (const col of [0, 1, 2] as FieldCol[]) {
      if (field[row][col].unit !== null) {
        positions.push({ row, col });
      }
    }
  }
  return positions;
}

/**
 * Returns positions adjacent to the given position (horizontal + vertical).
 */
export function getAdjacentPositions(pos: FieldPosition): FieldPosition[] {
  const adj: FieldPosition[] = [];
  const cols = [0, 1, 2] as FieldCol[];

  // Horizontal neighbors in same row
  const colIdx = pos.col;
  if (colIdx > 0) adj.push({ row: pos.row, col: cols[colIdx - 1] });
  if (colIdx < 2) adj.push({ row: pos.row, col: cols[colIdx + 1] });

  // Vertical neighbor (front ↔ back at same col)
  const otherRow: FieldRow = pos.row === "front" ? "back" : "front";
  adj.push({ row: otherRow, col: pos.col });

  return adj;
}

/**
 * Check if an attacker at `from` can reach a defender at `to`.
 *
 * Front melee  → can hit enemy front only
 * Back melee   → cannot attack at all
 * Front ranged → can hit enemy front, or enemy back if that column's front is empty
 * Back ranged  → same as front ranged (ranged/flying can attack from back row)
 */
export function canReach(
  attackerField: Field,
  attackerPos: FieldPosition,
  defenderField: Field,
  defenderPos: FieldPosition,
  attackerIsRanged: boolean,
  attackerIsFlying: boolean
): boolean {
  // Attacker must exist
  if (getSlot(attackerField, attackerPos).unit === null) return false;
  // Defender must exist
  if (getSlot(defenderField, defenderPos).unit === null) return false;

  const isRangedOrFlying = attackerIsRanged || attackerIsFlying;

  // Back-row melee attacker cannot attack at all
  if (attackerPos.row === "back" && !isRangedOrFlying) return false;

  // Front-row melee attacker can only hit enemy front row
  if (attackerPos.row === "front" && !isRangedOrFlying) {
    return defenderPos.row === "front";
  }

  // Ranged/Flying attacker — can always hit enemy front row
  if (defenderPos.row === "front") return true;

  // Ranged/Flying hitting enemy back row — only if front slot in that column is empty
  const frontSlot = defenderField.front[defenderPos.col];
  return frontSlot.unit === null;
}
