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
  _card: Card,
  pos: FieldPosition,
  handIndex: number
): AIDeployAction | null {
  const player = currentPlayer(state);
  const slot = getSlot(player.field, pos);
  if (!slot.unit || slot.weapon) return null;

  const reasoning: ScoreContribution[] = [{ label: "equip weapon", delta: SCORING.DEPLOY_WEAPON_BASE }];
  if (!slot.hasActed) {
    reasoning.push({ label: "unit hasn't acted yet", delta: SCORING.EQUIP_FRESH_UNIT_BONUS });
  }
  return { type: "deploy", handIndex, target: pos, score: sumScore(reasoning), reasoning };
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
    actions.push({
      type: "deploy",
      handIndex,
      target: { row: "back", col: 0 },
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
 * Render an AI action's reasoning as a single debug string.
 * Example: "KO target (+20) + deal 8 damage (+8) = 28"
 */
export function explainAction(action: AIAction): string {
  const parts = action.reasoning.map((c) => `${c.label} (${c.delta >= 0 ? "+" : ""}${c.delta})`);
  return `${parts.join(" + ")} = ${action.score.toFixed(1)}`;
}
