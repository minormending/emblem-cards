/**
 * @cards/battle-engine
 *
 * Pure-TypeScript game engine. No UI, no network, no React.
 * Given a GameState, this package exposes functions to mutate it according
 * to the game rules. Import, call, test — nothing else.
 *
 * File map:
 *   - players.ts : currentPlayer / opposingPlayer lookups
 *   - field.ts   : field/slot primitives (placeUnit, getSlot, canReach...)
 *   - game.ts    : turn flow (createGame, drawPhase, attackAction, endTurn)
 *   - deploy.ts  : deployCard + per-card-type handlers
 *   - effects.ts : resolveEffects for item/tactic cards
 *   - win.ts     : checkWinCondition
 *   - ai/        : AI opponent (scoring + turn execution)
 *
 * All actions that can fail return `Result<T>` from @cards/shared — no thrown
 * errors, no boolean returns. Check `result.ok` before using `result.value`.
 *
 * See docs/ARCHITECTURE.md for the big picture.
 */

// ── Player lookups ──
export { currentPlayer, opposingPlayer } from "./players.js";

// ── Field primitives ──
export {
  createEmptyField,
  getSlot,
  placeUnit,
  equipWeapon,
  removeUnit,
  getOccupiedPositions,
  getAdjacentPositions,
  canReach,
  resetActedFlags,
  canEquip,
  isMagicalType,
} from "./field.js";

// ── Turn flow ──
export {
  createGame,
  drawPhase,
  attackAction,
  canAttack,
  previewCombat,
  endTurn,
  isSupportPairActive,
} from "./game.js";
export type { CombatPreview } from "./game.js";

// ── Deploy ──
export { deployCard } from "./deploy.js";

// ── Win conditions & effect resolution ──
export { checkWinCondition } from "./win.js";
export { resolveEffects } from "./effects.js";

// ── Display helpers ──
export { getUnitCombatStats } from "./combatDisplay.js";
export type { UnitCombatStats } from "./combatDisplay.js";

// ── AI opponent ──
export { executeAITurn } from "./ai/aiPlayer.js";
export { pickBestAction, explainAction } from "./ai/evaluate.js";
export type {
  AIAction,
  AIDeployAction,
  AIAttackAction,
  ScoreContribution,
} from "./ai/evaluate.js";
