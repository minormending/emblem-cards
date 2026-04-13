import type { Effect, FieldPosition, GameEvent, GameState } from "@cards/shared";
import { getSlot, removeUnit } from "./field.js";
import { checkWinCondition } from "./win.js";
import { currentPlayer, opposingPlayer } from "./players.js";

/**
 * Resolve a list of effects from an item or tactic card.
 *
 * Returns the list of events that occurred (heals applied, damage dealt,
 * KOs, cards drawn, units moved). The caller can inspect these for
 * animations or logging; nothing downstream depends on state diffing.
 *
 * Target semantics:
 *   - heal_target / buff_target / reposition: target must be one of the
 *     player's own units (validated by the caller).
 *   - damage_target: target must be one of the opponent's units.
 *   - draw_cards: no target (operates on the player's own deck).
 *
 * Passive effects (double_attack, ranged, flying, damage_multiplier_vs_tag,
 * heal_adjacent, pair_bonus) are NOT resolved here — they're read in other
 * places (damage calc, end-of-turn, attack reach).
 */
export function resolveEffects(
  state: GameState,
  effects: Effect[],
  target?: FieldPosition
): GameEvent[] {
  const events: GameEvent[] = [];
  for (const effect of effects) {
    applyEffect(state, effect, target, events);
  }
  return events;
}

function applyEffect(
  state: GameState,
  effect: Effect,
  target: FieldPosition | undefined,
  events: GameEvent[]
): void {
  const player = currentPlayer(state);
  const opponent = opposingPlayer(state);

  switch (effect.kind) {
    case "heal_target": {
      if (!target) return;
      const slot = getSlot(player.field, target);
      if (!slot.unit) return;
      const before = slot.unit.stats.hp;
      const after = Math.min(before + effect.amount, slot.unit.maxHp);
      if (after === before) return;
      slot.unit.stats.hp = after;
      events.push({ kind: "unit_healed", position: target, amount: after - before, hpAfter: after });
      return;
    }

    case "damage_target": {
      if (!target) return;
      const defSlot = getSlot(opponent.field, target);
      if (!defSlot.unit) return;
      const before = defSlot.unit.stats.hp;
      defSlot.unit.stats.hp -= effect.amount;
      const hpAfter = Math.max(0, defSlot.unit.stats.hp);
      events.push({
        kind: "unit_damaged",
        position: target,
        amount: effect.amount,
        hpAfter,
        defenderName: defSlot.unit.name,
        defenderMaxHp: defSlot.unit.maxHp,
      });
      if (defSlot.unit.stats.hp <= 0) {
        const dyingUnit = defSlot.unit;
        const removed = removeUnit(opponent.field, target);
        if (removed.unit) opponent.discardPile.push(removed.unit);
        if (removed.weapon) opponent.discardPile.push(removed.weapon);
        events.push({ kind: "unit_ko", position: target, unit: dyingUnit });
        maybeGameWon(state, events);
      }
      if (before === defSlot.unit.stats.hp) {
        // no change; shouldn't happen with positive damage, but keep invariant
      }
      return;
    }

    case "draw_cards": {
      let drawn = 0;
      for (let i = 0; i < effect.amount; i++) {
        if (player.deck.length === 0) break;
        player.hand.push(player.deck.shift()!);
        drawn++;
      }
      if (drawn > 0) {
        events.push({ kind: "cards_drawn", player: player.id, amount: drawn });
      }
      return;
    }

    case "buff_target": {
      if (!target) return;
      const slot = getSlot(player.field, target);
      if (!slot.unit) return;
      if (effect.stat === "hp") {
        // HP buffs heal up to maxHp; no maxHp inflation
        const before = slot.unit.stats.hp;
        const after = Math.min(before + effect.amount, slot.unit.maxHp);
        const delta = after - before;
        if (delta > 0) {
          slot.unit.stats.hp = after;
          events.push({ kind: "unit_healed", position: target, amount: delta, hpAfter: after });
        }
      } else {
        slot.unit.stats[effect.stat] += effect.amount;
        events.push({ kind: "unit_buffed", position: target, stat: effect.stat, amount: effect.amount });
      }
      return;
    }

    case "reposition": {
      if (!target) return;
      const toPos: FieldPosition = {
        row: target.row === "front" ? "back" : "front",
        col: target.col,
      };
      const fromSlot = getSlot(player.field, target);
      const toSlot = getSlot(player.field, toPos);
      // Swap the two slots atomically
      const tmpUnit = fromSlot.unit;
      const tmpWeapon = fromSlot.weapon;
      const tmpActed = fromSlot.hasActed;
      fromSlot.unit = toSlot.unit;
      fromSlot.weapon = toSlot.weapon;
      fromSlot.hasActed = toSlot.hasActed;
      toSlot.unit = tmpUnit;
      toSlot.weapon = tmpWeapon;
      toSlot.hasActed = tmpActed;
      events.push({ kind: "unit_moved", from: target, to: toPos });
      return;
    }

    default:
      // Passive effects don't fire here.
      return;
  }
}

function maybeGameWon(state: GameState, events: GameEvent[]): void {
  const winner = checkWinCondition(state);
  if (winner && !state.winner) {
    state.winner = winner;
    events.push({ kind: "game_won", winner, reason: "lord_ko" });
  }
}
