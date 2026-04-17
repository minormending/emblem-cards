/**
 * AI scoring: score every legal action this turn, pick the highest.
 *
 * Every action carries a `reasoning` array — a list of (label, delta) pairs
 * that sum to `score`. This makes the AI explainable: when you see the AI
 * play a weird move, check the reasoning to find out which scoring factor
 * dominated.
 *
 * To tune AI behavior:
 *   - Edit the constants at the top (SCORING) — they're named after what
 *     they influence, so changes are obvious.
 *   - Add a new scoring factor by pushing to the reasoning array wherever
 *     relevant.
 */
import type {
  GameState,
  FieldPosition,
  FieldRow,
  FieldCol,
  Card,
  UnitCard,
  WeaponCard,
} from "@cards/shared";
import { calculateDamage } from "@cards/card-engine";
import { getSlot, getOccupiedPositions, canReach } from "../field.js";
import { currentPlayer, opposingPlayer } from "../players.js";

// ── Scoring weights ──
// Named constants instead of magic numbers inline. Tune these to change AI
// behavior without reading any other code.

const SCORING = {
  DEPLOY_UNIT_BASE: 10,
  DEPLOY_WEAPON_BASE: 6,
  DEPLOY_TACTIC_BASE: 5,
  DEPLOY_SUPPORT_BASE: 8,

  RIGHT_ROW_BONUS: 5,   // front for melee, back for ranged/healers
  WRONG_ROW_PENALTY: -3, // melee in back
  IS_LORD_BONUS: 3,
  STAT_WEIGHT: 0.5,     // multiplier on (str + mag)
  CHEAP_CARD_WEIGHT: 0.5, // bonus for cost < 5

  EQUIP_FRESH_UNIT_BONUS: 4, // equipping weapon on an un-acted unit

  DRAW_BONUS: 12,
  HEAL_PER_HP_MISSING: 0.5,
  HEAL_MIN_HP_MISSING: 3,
  DAMAGE_TACTIC_BASE: 8,
  DAMAGE_TACTIC_LORD_KILL_BONUS: 20,
  BUFF_TARGET_BASE: 3,

  KO_BONUS: 20,
  LORD_KO_BONUS: 50,
  LOW_HP_TARGET_BONUS: 5,
  WIMPY_ATTACK_PENALTY: -0.5, // 1-damage attacks

  // Actions below this total score aren't worth taking.
  MIN_ACTION_SCORE: 0,
};

// ── Action types ──

/** A single contributor to an action's score (used for debugging/logging). */
export interface ScoreContribution {
  label: string;
  delta: number;
}

export interface AIDeployAction {
  type: "deploy";
  handIndex: number;
  target: FieldPosition;
  score: number;
  reasoning: ScoreContribution[];
}

export interface AIAttackAction {
  type: "attack";
  from: FieldPosition;
  to: FieldPosition;
  score: number;
  expectedDamage: number;
  reasoning: ScoreContribution[];
}

export type AIAction = AIDeployAction | AIAttackAction;

// ── Small helpers ──

const ROWS: FieldRow[] = ["front", "back"];
const COLS: FieldCol[] = [0, 1, 2];
const ALL_POS: FieldPosition[] = ROWS.flatMap((row) => COLS.map((col) => ({ row, col })));

function hasEffect(unit: UnitCard, kind: string): boolean {
  return unit.effects.some((e) => e.kind === kind);
}

function sumScore(contributions: ScoreContribution[]): number {
  return contributions.reduce((total, c) => total + c.delta, 0);
}

function isRangedOrFlying(unit: UnitCard): boolean {
  return unit.attackType === "bow" || hasEffect(unit, "ranged") || hasEffect(unit, "flying");
}

// ── Unit deploy scoring ──

function scoreUnitDeploy(
  state: GameState,
  card: UnitCard,
  pos: FieldPosition,
  handIndex: number
): AIDeployAction | null {
  const player = currentPlayer(state);
  const slot = getSlot(player.field, pos);
  if (slot.unit !== null) return null;

  const reasoning: ScoreContribution[] = [{ label: "deploy unit", delta: SCORING.DEPLOY_UNIT_BASE }];

  const wantsBack = isRangedOrFlying(card) || card.effects.some((e) => e.kind === "heal_adjacent");
  if (wantsBack) {
    reasoning.push({
      label: pos.row === "back" ? "ranged/healer to back row" : "ranged/healer misplaced",
      delta: pos.row === "back" ? SCORING.RIGHT_ROW_BONUS : 0,
    });
  } else {
    reasoning.push({
      label: pos.row === "front" ? "melee to front row" : "melee in back (exposed)",
      delta: pos.row === "front" ? SCORING.RIGHT_ROW_BONUS : SCORING.WRONG_ROW_PENALTY,
    });
  }

  if (card.isLord) {
    reasoning.push({ label: "is Lord", delta: SCORING.IS_LORD_BONUS });
  }

  const statValue = (card.stats.str + card.stats.mag) * SCORING.STAT_WEIGHT;
  reasoning.push({ label: `stat value (${card.stats.str}STR + ${card.stats.mag}MAG)`, delta: statValue });

  const cheapness = (5 - card.cost) * SCORING.CHEAP_CARD_WEIGHT;
  reasoning.push({ label: `cost efficiency (${card.cost} energy)`, delta: cheapness });

  return { type: "deploy", handIndex, target: pos, score: sumScore(reasoning), reasoning };
}

// ── Weapon deploy scoring ──

function scoreWeaponDeploy(
  state: GameState,
  card: Card,
  pos: FieldPosition,
  handIndex: number
): AIDeployAction | null {
  if (card.type !== "weapon") return null;
  const player = currentPlayer(state);
  const slot = getSlot(player.field, pos);
  if (!slot.unit) return null;

  // Weapon-type compatibility mirrors field.ts canEquip — skip illegal equips.
  const unitMagical = ["fire", "wind", "thunder"].includes(slot.unit.attackType);
  const weaponMagical = ["fire", "wind", "thunder"].includes(card.attackType);
  if (unitMagical !== weaponMagical) return null;
  if (!weaponMagical && slot.unit.attackType !== card.attackType) return null;

  const reasoning: ScoreContribution[] = [];

  if (slot.weapon) {
    // Swap/upgrade path — only worth it if the new weapon is better.
    const delta = weaponPower(card) - weaponPower(slot.weapon);
    if (delta <= 0) return null;
    reasoning.push({ label: `upgrade weapon (+${delta})`, delta });
  } else {
    reasoning.push({ label: "equip weapon", delta: SCORING.DEPLOY_WEAPON_BASE });
  }

  if (!slot.hasActed) {
    reasoning.push({ label: "unit hasn't acted yet", delta: SCORING.EQUIP_FRESH_UNIT_BONUS });
  }
  return { type: "deploy", handIndex, target: pos, score: sumScore(reasoning), reasoning };
}

/**
 * Rough worth of a weapon: its best offensive stat boost plus a flat bonus
 * per effect. Used for comparing candidates in a swap.
 */
function weaponPower(w: WeaponCard): number {
  const str = w.statBoost.str ?? 0;
  const mag = w.statBoost.mag ?? 0;
  return Math.max(str, mag) + w.effects.length * 3;
}

// ── Item / tactic deploy scoring ──

function scoreItemOrTacticDeploy(
  state: GameState,
  card: Extract<Card, { type: "item" | "tactic" }>,
  handIndex: number
): AIDeployAction[] {
  const kinds = new Set(card.effects.map((e) => e.kind));
  const actions: AIDeployAction[] = [];

  // Un-targeted effects — single action
  if (kinds.has("draw_cards")) {
    actions.push({
      type: "deploy",
      handIndex,
      target: { row: "back", col: 0 },
      score: SCORING.DRAW_BONUS,
      reasoning: [{ label: "draw cards", delta: SCORING.DRAW_BONUS }],
    });
    return actions;
  }
  if (kinds.has("reposition")) {
    // Reposition swaps the target with the opposite row at the same column.
    // The engine validates that the target slot has a unit — picking
    // `{ back, 0 }` unconditionally would abort the turn when that slot is
    // empty. Aim at an actual own unit instead. Prefer front-row wounded
    // units (the classic "pull them back" play).
    const own = getOccupiedPositions(currentPlayer(state).field);
    if (own.length === 0) return actions;
    const target =
      own.find((p) => {
        const u = getSlot(currentPlayer(state).field, p).unit;
        return p.row === "front" && u && u.stats.hp < u.maxHp * 0.5;
      }) ?? own[0];
    actions.push({
      type: "deploy",
      handIndex,
      target,
      score: SCORING.DEPLOY_TACTIC_BASE,
      reasoning: [{ label: "reposition tactic", delta: SCORING.DEPLOY_TACTIC_BASE }],
    });
    return actions;
  }

  // Targeted effects — iterate positions
  for (const pos of ALL_POS) {
    const action = scoreTargetedItem(state, card, pos, handIndex, kinds);
    if (action) actions.push(action);
  }
  return actions;
}

function scoreTargetedItem(
  state: GameState,
  card: Extract<Card, { type: "item" | "tactic" }>,
  pos: FieldPosition,
  handIndex: number,
  kinds: Set<string>
): AIDeployAction | null {
  const reasoning: ScoreContribution[] = [];

  if (kinds.has("heal_target")) {
    const slot = getSlot(currentPlayer(state).field, pos);
    if (!slot.unit) return null;
    const missing = slot.unit.maxHp - slot.unit.stats.hp;
    if (missing < SCORING.HEAL_MIN_HP_MISSING) return null;
    reasoning.push({ label: "heal base", delta: SCORING.DEPLOY_TACTIC_BASE });
    reasoning.push({
      label: `restores ${missing} HP`,
      delta: missing * SCORING.HEAL_PER_HP_MISSING,
    });
  } else if (kinds.has("damage_target")) {
    const slot = getSlot(opposingPlayer(state).field, pos);
    if (!slot.unit) return null;
    reasoning.push({ label: "direct damage", delta: SCORING.DAMAGE_TACTIC_BASE });
    if (slot.unit.isLord) {
      reasoning.push({
        label: "targets enemy Lord",
        delta: SCORING.DAMAGE_TACTIC_LORD_KILL_BONUS,
      });
    }
  } else if (kinds.has("buff_target")) {
    const slot = getSlot(currentPlayer(state).field, pos);
    if (!slot.unit) return null;
    reasoning.push({ label: "buff base", delta: SCORING.DEPLOY_TACTIC_BASE });
    reasoning.push({ label: "stat boost", delta: SCORING.BUFF_TARGET_BASE });
    if (!slot.hasActed) {
      reasoning.push({ label: "target hasn't acted yet", delta: SCORING.EQUIP_FRESH_UNIT_BONUS });
    }
  } else {
    return null;
  }

  const _card = card; // appease unused-param lint (logging could use this)
  return {
    type: "deploy",
    handIndex,
    target: pos,
    score: sumScore(reasoning),
    reasoning,
  };
  void _card;
}

// ── Support deploy scoring ──

function scoreSupportDeploy(
  state: GameState,
  card: Extract<Card, { type: "support" }>,
  handIndex: number
): AIDeployAction | null {
  const player = currentPlayer(state);
  if (player.activeSupportCards.some((s) => s.id === card.id)) return null;

  const ownPositions = getOccupiedPositions(player.field);
  const { classA, classB } = card.pairRequirement;
  const countClass = (cls: string) =>
    ownPositions.filter((p) => getSlot(player.field, p).unit?.class === cls).length;

  const needTwoOfOne = classA === classB;
  const aOk = needTwoOfOne ? countClass(classA) >= 2 : countClass(classA) >= 1;
  const bOk = needTwoOfOne ? true : countClass(classB) >= 1;
  if (!aOk || !bOk) return null;

  return {
    type: "deploy",
    handIndex,
    target: { row: "back", col: 0 },
    score: SCORING.DEPLOY_SUPPORT_BASE,
    reasoning: [
      { label: "activate support pair", delta: SCORING.DEPLOY_SUPPORT_BASE },
    ],
  };
}

// ── Deploy enumeration ──

export function scoreDeploys(state: GameState): AIDeployAction[] {
  const player = currentPlayer(state);
  const actions: AIDeployAction[] = [];

  for (let i = 0; i < player.hand.length; i++) {
    const card = player.hand[i];
    if (card.cost > player.energy) continue;

    switch (card.type) {
      case "unit":
        for (const pos of ALL_POS) {
          const action = scoreUnitDeploy(state, card, pos, i);
          if (action) actions.push(action);
        }
        break;
      case "weapon":
        for (const pos of ALL_POS) {
          const action = scoreWeaponDeploy(state, card, pos, i);
          if (action) actions.push(action);
        }
        break;
      case "item":
      case "tactic":
        actions.push(...scoreItemOrTacticDeploy(state, card, i));
        break;
      case "support": {
        const action = scoreSupportDeploy(state, card, i);
        if (action) actions.push(action);
        break;
      }
    }
  }

  return actions;
}

// ── Attack scoring ──

export function scoreAttacks(state: GameState): AIAttackAction[] {
  const player = currentPlayer(state);
  const opponent = opposingPlayer(state);
  const actions: AIAttackAction[] = [];

  for (const from of getOccupiedPositions(player.field)) {
    const atkSlot = getSlot(player.field, from);
    if (!atkSlot.unit || atkSlot.hasActed) continue;

    const isRanged = hasEffect(atkSlot.unit, "ranged") || atkSlot.unit.attackType === "bow";
    const isFlying = hasEffect(atkSlot.unit, "flying");

    for (const to of getOccupiedPositions(opponent.field)) {
      if (!canReach(player.field, from, opponent.field, to, isRanged, isFlying)) continue;

      const defSlot = getSlot(opponent.field, to);
      if (!defSlot.unit) continue;

      const damage = calculateDamage(
        atkSlot.unit,
        atkSlot.weapon,
        defSlot.unit,
        defSlot.weapon
      );

      const reasoning: ScoreContribution[] = [
        { label: `deal ${damage.totalDamage} damage`, delta: damage.totalDamage },
      ];
      const kills = damage.totalDamage >= defSlot.unit.stats.hp;
      if (kills) {
        reasoning.push({ label: "KO target", delta: SCORING.KO_BONUS });
        if (defSlot.unit.isLord) {
          reasoning.push({ label: "KO enemy Lord (win!)", delta: SCORING.LORD_KO_BONUS });
        }
      }
      if (defSlot.unit.stats.hp <= 10) {
        reasoning.push({ label: "target is wounded", delta: SCORING.LOW_HP_TARGET_BONUS });
      }
      if (damage.totalDamage <= 1) {
        reasoning.push({ label: "only 1 damage", delta: SCORING.WIMPY_ATTACK_PENALTY });
      }

      actions.push({
        type: "attack",
        from,
        to,
        score: sumScore(reasoning),
        expectedDamage: damage.totalDamage,
        reasoning,
      });
    }
  }

  return actions;
}

// ── Top-level picker ──

/**
 * Pick the single best action from all legal options this turn.
 * Returns null when nothing is worth doing (AI should end turn).
 */
export function pickBestAction(state: GameState): AIAction | null {
  const all: AIAction[] = [...scoreDeploys(state), ...scoreAttacks(state)];
  if (all.length === 0) return null;

  all.sort((a, b) => b.score - a.score);
  const best = all[0];
  if (best.score <= SCORING.MIN_ACTION_SCORE) return null;
  return best;
}

/**
 * Enumerate every legal action this turn with its computed score.
 * Caller is responsible for sorting / thresholding / picking — this is
 * the hook difficulty presets use to apply aggression weights and top-K
 * sampling without re-implementing the scoring pipeline.
 */
export function scoreAllActions(state: GameState): AIAction[] {
  return [...scoreDeploys(state), ...scoreAttacks(state)];
}

// ── Aggression component extraction ──

/**
 * Labels whose contribution is considered "aggression" — i.e. damage to
 * the opposing player's board/Lord. Used by AIConfig.aggressionWeight to
 * re-weight offensive lines without changing the base evaluator.
 *
 * Kept as a prefix match (startsWith) because a few labels are dynamic
 * ("deal 7 damage"). If you add a new offensive reasoning label in this
 * file, add its prefix here too.
 */
const AGGRESSION_LABEL_PREFIXES = [
  "deal ", // "deal N damage"
  "KO target",
  "KO enemy Lord",
  "target is wounded",
  "direct damage",
  "targets enemy Lord",
];

/**
 * Sum of an action's reasoning contributions that count as "aggression"
 * (offense vs the opponent). Used by difficulty presets to amplify or
 * dampen offensive lines.
 */
export function aggressionComponent(action: AIAction): number {
  let total = 0;
  for (const c of action.reasoning) {
    if (AGGRESSION_LABEL_PREFIXES.some((p) => c.label.startsWith(p))) {
      total += c.delta;
    }
  }
  return total;
}

/**
 * Render an AI action's reasoning as a single debug string.
 * Example: "KO target (+20) + deal 8 damage (+8) = 28"
 */
export function explainAction(action: AIAction): string {
  const parts = action.reasoning.map((c) => `${c.label} (${c.delta >= 0 ? "+" : ""}${c.delta})`);
  return `${parts.join(" + ")} = ${action.score.toFixed(1)}`;
}
