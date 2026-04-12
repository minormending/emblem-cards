/**
 * @cards/card-engine
 *
 * Card data and pure functions that reason about individual cards or pairs.
 * This package does NOT manage game state (that's @cards/battle-engine).
 *
 * File map:
 *   - cards/     : all card data (units, weapons, items, supports, tactics)
 *   - damage.ts  : calculateDamage — the STR/MAG vs DEF/RES formula
 *   - triangles.ts : weapon & magic triangle lookups
 */

export { getTriangleBonus, TRIANGLE_BONUS } from "./triangles.js";
export { calculateDamage } from "./damage.js";
export type { DamageResult } from "./damage.js";
export {
  allCards,
  units,
  weapons,
  items,
  supports,
  tactics,
  getCardById,
  getUnitsByClass,
  getUnitsByAttackType,
  getWeaponsForType,
  getLords,
} from "./cards/index.js";
