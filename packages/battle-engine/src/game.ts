/**
 * Turn flow: createGame, drawPhase, attackAction, endTurn.
 *
 * Every mutating action (except createGame, which is a constructor) returns
 * a list of GameEvents describing what happened. UI layers consume events
 * for animations and logs; tests can assert on specific events.
 *
 * Deploy logic lives in ./deploy.ts (with per-card-type handlers).
 * Effect resolution for items/tactics lives in ./effects.ts.
 * Win detection lives in ./win.ts.
 * Player lookup helpers live in ./players.ts.
 */
import type {
  GameState,
  Player,
  Card,
  UnitCard,
  SupportCard,
  FieldPosition,
  Effect,
  Field,
  GameEvent,
  Result,
} from "@cards/shared";
import {
  STARTING_HAND_SIZE,
  STARTING_ENERGY,
  MAX_ENERGY,
  ok,
  err,
  ErrorCode,
} from "@cards/shared";
import { calculateDamage } from "@cards/card-engine";
import {
  createEmptyField,
  getSlot,
  removeUnit,
  getOccupiedPositions,
  getAdjacentPositions,
  canReach,
  resetActedFlags,
} from "./field.js";
import { checkWinCondition } from "./win.js";
import { currentPlayer, opposingPlayer } from "./players.js";

// ── Game creation ──

export function createGame(
  p1Deck: Card[],
  p2Deck: Card[],
  p1Id: string,
  p2Id: string
): GameState {
  return {
    players: [makePlayer(p1Id, p1Deck), makePlayer(p2Id, p2Deck)],
    currentPlayerIndex: 0,
    turnNumber: 1,
    turnStep: "draw",
    winner: null,
  };
}

function makePlayer(id: string, deck: Card[]): Player {
  const shuffled = shuffle([...deck]);
  const hand = shuffled.splice(0, STARTING_HAND_SIZE);
  return {
    id,
    name: id,
    deck: shuffled,
    hand,
    field: createEmptyField(),
    discardPile: [],
    energy: STARTING_ENERGY,
    maxEnergy: STARTING_ENERGY,
    activeSupportCards: [],
  };
}

/** Fisher-Yates — uniformly random. Don't replace with .sort(Math.random()-0.5). */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ── Support-pair predicate ──

/**
 * True when at least one of the support's listed classes is on the field.
 *
 * The original design required BOTH classes to be present at the same time,
 * but with 15-card decks that combo almost never landed — supports felt
 * like dead draws. This loosens to "either class present" so the support
 * card activates as soon as one relevant unit is deployed, keeping the
 * thematic pairing in the card text but making the effect actually reachable.
 *
 * Same-class pairs (e.g. Cavalier+Cavalier) still require two distinct
 * units of that class, since "one of A or B" would otherwise be "one of A".
 */
export function isSupportPairActive(field: Field, support: SupportCard): boolean {
  const { classA, classB } = support.pairRequirement;
  const classes = getOccupiedPositions(field)
    .map((p) => getSlot(field, p).unit?.class)
    .filter((c): c is string => Boolean(c));

  if (classA === classB) {
    return classes.filter((c) => c === classA).length >= 2;
  }
  return classes.includes(classA) || classes.includes(classB);
}

// ── Draw phase ──

/**
 * Draw one card. Returns ok(true) if drawn, ok(false) if the deck was empty.
 * Not an error — a player can continue with what they have.
 */
export function drawPhase(state: GameState): Result<boolean> {
  const player = currentPlayer(state);
  if (player.deck.length === 0) return ok(false);
  player.hand.push(player.deck.shift()!);
  state.turnStep = "deploy";
  return ok(true);
}

// ── Deploy (delegated to ./deploy.ts) ──
export { deployCard } from "./deploy.js";

// ── Attack ──

/**
 * Attack with a unit. Fails when:
 *   - No unit at the attacker or defender position
 *   - Attacker already acted this turn
 *   - Attacker can't reach the target (row/range rules)
 *
 * On success, returns the list of events: unit_damaged, possibly unit_ko,
 * possibly game_won. If the defender survives and is able to reach back
 * under the normal reach rules, a counter-attack is resolved immediately
 * and its events are appended.
 */
export function attackAction(
  state: GameState,
  attackerPos: FieldPosition,
  defenderPos: FieldPosition
): Result<GameEvent[]> {
  const player = currentPlayer(state);
  const opponent = opposingPlayer(state);

  const atkSlot = getSlot(player.field, attackerPos);
  const defSlot = getSlot(opponent.field, defenderPos);

  if (!atkSlot.unit) return err(ErrorCode.NO_ATTACKER);
  if (!defSlot.unit) return err(ErrorCode.NO_DEFENDER);
  if (atkSlot.hasActed) return err(ErrorCode.UNIT_ALREADY_ACTED);
  if (!canReach(
    player.field,
    attackerPos,
    opponent.field,
    defenderPos,
    isRanged(atkSlot.unit, atkSlot.weapon),
    isFlying(atkSlot.unit, atkSlot.weapon),
  )) {
    return err(ErrorCode.CANNOT_REACH);
  }

  const damage = calculateDamage(
    atkSlot.unit,
    atkSlot.weapon,
    defSlot.unit,
    defSlot.weapon,
    {
      attackerSupports: player.activeSupportCards,
      defenderSupports: opponent.activeSupportCards,
      isActiveSupport: (support, side) => {
        const field = side === "attacker" ? player.field : opponent.field;
        return isSupportPairActive(field, support);
      },
    }
  );

  // Apply damage
  defSlot.unit.stats.hp -= damage.totalDamage;
  atkSlot.hasActed = true;

  const events: GameEvent[] = [
    {
      kind: "unit_damaged",
      position: defenderPos,
      amount: damage.totalDamage,
      hpAfter: Math.max(0, defSlot.unit.stats.hp),
      source: attackerPos,
      attackerName: atkSlot.unit.name,
      defenderName: defSlot.unit.name,
      defenderMaxHp: defSlot.unit.maxHp,
      attackerAttackType: atkSlot.unit.attackType,
      attackerUnit: atkSlot.unit,
      attackerOwner: player.id,
      defenderUnit: defSlot.unit,
    },
  ];

  // KO check on the original defender
  let defenderKOd = false;
  if (defSlot.unit.stats.hp <= 0) {
    defenderKOd = true;
    const dyingUnit = defSlot.unit;
    const removed = removeUnit(opponent.field, defenderPos);
    if (removed.unit) opponent.discardPile.push(removed.unit);
    if (removed.weapon) opponent.discardPile.push(removed.weapon);
    events.push({ kind: "unit_ko", position: defenderPos, unit: dyingUnit });
    if (!state.winner) {
      const winner = checkWinCondition(state);
      if (winner) {
        state.winner = winner;
        events.push({ kind: "game_won", winner, reason: "lord_ko" });
      }
    }
  }

  // ── Counter-attack ──
  // If the defender survived and can reach the attacker under the normal
  // reach rules, they retaliate automatically. The counter does not consume
  // the defender's `hasActed` — it's a reaction, not their scheduled action.
  if (!defenderKOd && !state.winner) {
    // After KO handling above, defSlot still references the same slot, and
    // we know defSlot.unit is non-null because the defender survived.
    const counterReaches = canReach(
      opponent.field,
      defenderPos,
      player.field,
      attackerPos,
      isRanged(defSlot.unit!, defSlot.weapon),
      isFlying(defSlot.unit!, defSlot.weapon),
    );
    if (counterReaches) {
      const counterDamage = calculateDamage(
        defSlot.unit!,
        defSlot.weapon,
        atkSlot.unit,
        atkSlot.weapon,
        {
          attackerSupports: opponent.activeSupportCards,
          defenderSupports: player.activeSupportCards,
          isActiveSupport: (support, side) => {
            // `side` is from the counter's perspective: the counter's
            // attacker is the original defender (opponent), the counter's
            // defender is the original attacker (player).
            const field = side === "attacker" ? opponent.field : player.field;
            return isSupportPairActive(field, support);
          },
        }
      );

      atkSlot.unit.stats.hp -= counterDamage.totalDamage;
      events.push({
        kind: "unit_damaged",
        position: attackerPos,
        amount: counterDamage.totalDamage,
        hpAfter: Math.max(0, atkSlot.unit.stats.hp),
        source: defenderPos,
        attackerName: defSlot.unit!.name,
        defenderName: atkSlot.unit.name,
        defenderMaxHp: atkSlot.unit.maxHp,
        attackerAttackType: defSlot.unit!.attackType,
        attackerUnit: defSlot.unit!,
        attackerOwner: opponent.id,
        defenderUnit: atkSlot.unit,
        isCounter: true,
      });

      if (atkSlot.unit.stats.hp <= 0) {
        const dyingAttacker = atkSlot.unit;
        const removed = removeUnit(player.field, attackerPos);
        if (removed.unit) player.discardPile.push(removed.unit);
        if (removed.weapon) player.discardPile.push(removed.weapon);
        events.push({ kind: "unit_ko", position: attackerPos, unit: dyingAttacker });
        if (!state.winner) {
          const winner = checkWinCondition(state);
          if (winner) {
            state.winner = winner;
            events.push({ kind: "game_won", winner, reason: "lord_ko" });
          }
        }
      }
    }
  }

  return ok(events);
}

/**
 * Would an attack at (attackerPos → defenderPos) be legal under the reach
 * rules? Same check the server runs inside `attackAction`, exposed so the UI
 * can highlight only legal targets. Does not check turn / hasActed.
 */
export function canAttack(
  ownField: Field,
  attackerPos: FieldPosition,
  enemyField: Field,
  defenderPos: FieldPosition,
): boolean {
  const atk = getSlot(ownField, attackerPos);
  if (!atk.unit) return false;
  return canReach(
    ownField,
    attackerPos,
    enemyField,
    defenderPos,
    isRanged(atk.unit, atk.weapon),
    isFlying(atk.unit, atk.weapon),
  );
}

export interface CombatPreview {
  /** Damage the attacker would deal. */
  out: number;
  /** Damage the defender would deal back in counter (0 if no counter). */
  in: number;
  /** Would the initial attack KO the defender? */
  attackerKOs: boolean;
  /** Would the counter KO the attacker? (Always false when attackerKOs.) */
  counterKOs: boolean;
  /** True when the defender can reach back at all (and would therefore counter). */
  counters: boolean;
}

/**
 * Project the result of an attack without mutating state — used to show
 * tactical previews (expected damage, KO signals) in the UI before the
 * player commits.
 *
 * Returns null if the attack isn't legal (no attacker, no defender, or
 * out of reach). Takes fields + supports explicitly so it works from a
 * GameState on the server/AI and from a partial GameView on an online
 * client (pass empty arrays when opponent supports are hidden).
 */
export function previewCombat(
  attackerField: Field,
  attackerPos: FieldPosition,
  defenderField: Field,
  defenderPos: FieldPosition,
  attackerSupports: SupportCard[],
  defenderSupports: SupportCard[],
): CombatPreview | null {
  const atkSlot = getSlot(attackerField, attackerPos);
  const defSlot = getSlot(defenderField, defenderPos);
  if (!atkSlot.unit || !defSlot.unit) return null;

  if (!canReach(
    attackerField,
    attackerPos,
    defenderField,
    defenderPos,
    isRanged(atkSlot.unit, atkSlot.weapon),
    isFlying(atkSlot.unit, atkSlot.weapon),
  )) {
    return null;
  }

  const outgoing = calculateDamage(
    atkSlot.unit,
    atkSlot.weapon,
    defSlot.unit,
    defSlot.weapon,
    {
      attackerSupports,
      defenderSupports,
      isActiveSupport: (support, side) =>
        isSupportPairActive(side === "attacker" ? attackerField : defenderField, support),
    },
  );
  const attackerKOs = outgoing.totalDamage >= defSlot.unit.stats.hp;

  if (attackerKOs) {
    return {
      out: outgoing.totalDamage,
      in: 0,
      attackerKOs: true,
      counterKOs: false,
      counters: false,
    };
  }

  const canCounter = canReach(
    defenderField,
    defenderPos,
    attackerField,
    attackerPos,
    isRanged(defSlot.unit, defSlot.weapon),
    isFlying(defSlot.unit, defSlot.weapon),
  );
  if (!canCounter) {
    return {
      out: outgoing.totalDamage,
      in: 0,
      attackerKOs: false,
      counterKOs: false,
      counters: false,
    };
  }

  const counter = calculateDamage(
    defSlot.unit,
    defSlot.weapon,
    atkSlot.unit,
    atkSlot.weapon,
    {
      attackerSupports: defenderSupports,
      defenderSupports: attackerSupports,
      isActiveSupport: (support, side) =>
        isSupportPairActive(side === "attacker" ? defenderField : attackerField, support),
    },
  );
  const counterKOs = counter.totalDamage >= atkSlot.unit.stats.hp;

  return {
    out: outgoing.totalDamage,
    in: counter.totalDamage,
    attackerKOs: false,
    counterKOs,
    counters: true,
  };
}

/** Unit is ranged if it attacks with a bow, or has a ranged effect on itself or its weapon. */
function isRanged(unit: UnitCard, weapon: { attackType: string; effects: Effect[] } | null): boolean {
  if (unit.attackType === "bow") return true;
  if (unit.effects.some((e) => e.kind === "ranged")) return true;
  if (!weapon) return false;
  if (weapon.attackType === "bow") return true;
  return weapon.effects.some((e) => e.kind === "ranged");
}

/** Unit is flying if it has a flying effect on itself or its weapon. */
function isFlying(unit: UnitCard, weapon: { effects: Effect[] } | null): boolean {
  if (unit.effects.some((e) => e.kind === "flying")) return true;
  return weapon ? weapon.effects.some((e) => e.kind === "flying") : false;
}

// ── End turn ──

/**
 * End the current turn. Not fallible — returns events directly.
 *
 * Sequence:
 *   1. Resolve end-of-turn effects (heal auras from units + supports)
 *   2. Check for win (a heal can't kill, but deck-out + lord KO can)
 *   3. Swap to next player
 *   4. Increment energy, reset hasActed
 *   5. Check deck-out loss for the incoming player
 */
export function endTurn(state: GameState): GameEvent[] {
  const events: GameEvent[] = [];
  const ending = currentPlayer(state);

  events.push(...applyUnitHealAuras(ending));
  events.push(...applySupportHeals(ending));

  // Heal auras can't cause wins, but we already might be in a won state.
  if (!state.winner) {
    const winNow = checkWinCondition(state);
    if (winNow) {
      state.winner = winNow;
      events.push({ kind: "game_won", winner: winNow, reason: "lord_ko" });
      return events;
    }
  }

  // Swap turns
  const nextIndex: 0 | 1 = state.currentPlayerIndex === 0 ? 1 : 0;
  state.currentPlayerIndex = nextIndex;
  state.turnNumber++;
  const next = currentPlayer(state);

  events.push({
    kind: "turn_ended",
    endingPlayer: ending.id,
    nextPlayer: next.id,
    turnNumber: state.turnNumber,
  });

  // Energy pump
  const energyBefore = next.energy;
  next.maxEnergy = Math.min(next.maxEnergy + 1, MAX_ENERGY);
  next.energy = next.maxEnergy;
  if (next.energy !== energyBefore) {
    events.push({ kind: "energy_changed", player: next.id, from: energyBefore, to: next.energy });
  }

  resetActedFlags(next.field);
  state.turnStep = "draw";

  // Deck-out loss: incoming player has no cards and no units
  if (
    next.deck.length === 0 &&
    getOccupiedPositions(next.field).length === 0 &&
    !state.winner
  ) {
    state.winner = ending.id;
    events.push({ kind: "game_won", winner: ending.id, reason: "deck_out" });
  }

  return events;
}

/** Heal auras from units' own heal_adjacent effects. */
function applyUnitHealAuras(player: Player): GameEvent[] {
  const events: GameEvent[] = [];
  for (const pos of getOccupiedPositions(player.field)) {
    const unit = getSlot(player.field, pos).unit;
    if (!unit) continue;
    for (const effect of unit.effects) {
      if (effect.kind !== "heal_adjacent") continue;
      for (const adjPos of getAdjacentPositions(pos)) {
        const adj = getSlot(player.field, adjPos).unit;
        if (!adj) continue;
        const before = adj.stats.hp;
        const healed = Math.min(before + effect.amount, adj.maxHp);
        if (healed > before) {
          adj.stats.hp = healed;
          events.push({ kind: "unit_healed", position: adjPos, amount: healed - before, hpAfter: healed });
        }
      }
    }
  }
  return events;
}

/** Heals from active support cards when both required classes are on the field. */
function applySupportHeals(player: Player): GameEvent[] {
  const events: GameEvent[] = [];
  for (const support of player.activeSupportCards) {
    if (!isSupportPairActive(player.field, support)) continue;
    for (const effect of support.effects) {
      if (effect.kind !== "heal_adjacent") continue;
      const pairClasses = new Set([
        support.pairRequirement.classA,
        support.pairRequirement.classB,
      ]);
      for (const pos of getOccupiedPositions(player.field)) {
        const unit = getSlot(player.field, pos).unit;
        if (!unit || !pairClasses.has(unit.class)) continue;
        const before = unit.stats.hp;
        const healed = Math.min(before + effect.amount, unit.maxHp);
        if (healed > before) {
          unit.stats.hp = healed;
          events.push({ kind: "unit_healed", position: pos, amount: healed - before, hpAfter: healed });
        }
      }
    }
  }
  return events;
}

// Re-export player helpers for convenience
export { currentPlayer, opposingPlayer };
