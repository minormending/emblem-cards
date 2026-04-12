/**
 * Deploy a card from hand. Orchestrator + per-card-type handlers.
 *
 * Each handler validates, mutates state, and emits events. The orchestrator
 * (deployCard) handles shared bookkeeping: energy check, removing the card
 * from hand, and deducting energy on success.
 *
 * Return shape: `Result<GameEvent[]>` — success returns every event that
 * happened, failure returns a typed error.
 */
import type {
  Card,
  FieldPosition,
  GameEvent,
  GameState,
  ItemCard,
  Result,
  SupportCard,
  TacticCard,
  UnitCard,
  WeaponCard,
} from "@cards/shared";
import { ok, err, ErrorCode } from "@cards/shared";
import {
  canEquip,
  equipWeaponAndGetOld,
  getSlot,
  isMagicalType,
  placeUnit,
} from "./field.js";
import { resolveEffects } from "./effects.js";
import { currentPlayer, opposingPlayer } from "./players.js";

// ── Per-card-type handlers ──
// Each returns:
//   - ok({ events, selfManaged: boolean }) on success
//   - err(...) on validation failure
//
// selfManaged === true means the handler already took the card from the hand
// and deducted energy. The orchestrator skips that cleanup in that case.

interface HandlerSuccess {
  events: GameEvent[];
  selfManaged: boolean;
}

function deployUnit(
  state: GameState,
  card: UnitCard,
  target: FieldPosition | undefined
): Result<HandlerSuccess> {
  if (!target) return err(ErrorCode.MISSING_TARGET);
  const player = currentPlayer(state);
  if (!placeUnit(player.field, target, card)) {
    return err(ErrorCode.SLOT_OCCUPIED);
  }

  const events: GameEvent[] = [
    { kind: "unit_deployed", position: target, unit: card },
  ];

  // On-deploy effects (e.g. Thief draws a card).
  for (const effect of card.effects) {
    if (effect.kind === "draw_cards") {
      let drawn = 0;
      for (let i = 0; i < effect.amount; i++) {
        if (player.deck.length === 0) break;
        player.hand.push(player.deck.shift()!);
        drawn++;
      }
      if (drawn > 0) {
        events.push({ kind: "cards_drawn", player: player.id, amount: drawn });
      }
    }
  }

  return ok({ events, selfManaged: false });
}

function deployWeapon(
  state: GameState,
  card: WeaponCard,
  target: FieldPosition | undefined
): Result<HandlerSuccess> {
  if (!target) return err(ErrorCode.MISSING_TARGET);
  const player = currentPlayer(state);
  const slot = getSlot(player.field, target);
  if (!slot.unit) return err(ErrorCode.NO_UNIT_AT_TARGET);

  if (!canEquip(slot.unit.attackType, card.attackType)) {
    const weaponMagical = isMagicalType(card.attackType);
    const unitMagical = isMagicalType(slot.unit.attackType);
    if (weaponMagical && !unitMagical) return err(ErrorCode.TOME_ON_WARRIOR);
    if (!weaponMagical && unitMagical) return err(ErrorCode.WEAPON_ON_MAGE);
    return err(ErrorCode.WEAPON_TYPE_MISMATCH, `${card.attackType} on ${slot.unit.attackType}`);
  }

  const equip = equipWeaponAndGetOld(player.field, target, card);
  if (!equip.success) return err(ErrorCode.WEAPON_TYPE_MISMATCH);

  const events: GameEvent[] = [
    { kind: "weapon_equipped", position: target, weapon: card, displaced: equip.displaced },
  ];
  if (equip.displaced) {
    player.discardPile.push(equip.displaced);
    events.push({ kind: "card_discarded", player: player.id, card: equip.displaced });
  }

  return ok({ events, selfManaged: false });
}

function deploySupport(
  state: GameState,
  card: SupportCard,
  handIndex: number
): Result<HandlerSuccess> {
  const player = currentPlayer(state);
  const alreadyActive = player.activeSupportCards.some((s) => s.id === card.id);

  if (alreadyActive) {
    // Self-manage: discard the duplicate, consume energy, do not activate.
    player.discardPile.push(card);
    player.hand.splice(handIndex, 1);
    player.energy -= card.cost;
    return ok({
      events: [
        { kind: "support_duplicate_discarded", support: card },
        { kind: "card_discarded", player: player.id, card },
      ],
      selfManaged: true,
    });
  }

  player.activeSupportCards.push(card);
  return ok({
    events: [{ kind: "support_activated", support: card }],
    selfManaged: false,
  });
}

function deployItemOrTactic(
  state: GameState,
  card: ItemCard | TacticCard,
  target: FieldPosition | undefined,
  handIndex: number
): Result<HandlerSuccess> {
  // Validate target before mutating anything
  const targeted = card.effects.find((e) =>
    e.kind === "heal_target" ||
    e.kind === "damage_target" ||
    e.kind === "buff_target" ||
    e.kind === "reposition"
  );
  if (targeted) {
    if (!target) return err(ErrorCode.MISSING_TARGET);
    if (targeted.kind === "heal_target" || targeted.kind === "buff_target" || targeted.kind === "reposition") {
      const slot = getSlot(currentPlayer(state).field, target);
      if (!slot.unit) return err(ErrorCode.NO_UNIT_AT_TARGET);
    } else if (targeted.kind === "damage_target") {
      const slot = getSlot(opposingPlayer(state).field, target);
      if (!slot.unit) return err(ErrorCode.NO_ENEMY_AT_TARGET);
    }
  }

  const player = currentPlayer(state);
  const events: GameEvent[] = [
    { kind: "item_played", card, target: target ?? null },
  ];
  events.push(...resolveEffects(state, card.effects, target));
  player.discardPile.push(card);
  events.push({ kind: "card_discarded", player: player.id, card });
  player.hand.splice(handIndex, 1);
  player.energy -= card.cost;
  return ok({ events, selfManaged: true });
}

// ── Top-level dispatch ──

/**
 * Deploy the card at `handIndex` from the current player's hand.
 *
 * Returns Result<GameEvent[]> — the caller can inspect events for exactly
 * what happened (unit placed, card drawn from Thief ability, weapon displaced,
 * item fired, etc.).
 */
export function deployCard(
  state: GameState,
  handIndex: number,
  target?: FieldPosition
): Result<GameEvent[]> {
  const player = currentPlayer(state);
  const card = player.hand[handIndex];
  if (!card) return err(ErrorCode.INVALID_HAND_INDEX);
  if (card.cost > player.energy) return err(ErrorCode.NOT_ENOUGH_ENERGY);

  const handlerResult = dispatchByType(state, card, target, handIndex);
  if (!handlerResult.ok) return handlerResult;

  // For non-self-managed handlers, finish the bookkeeping uniformly.
  if (!handlerResult.value.selfManaged) {
    player.hand.splice(handIndex, 1);
    player.energy -= card.cost;
  }
  return ok(handlerResult.value.events);
}

function dispatchByType(
  state: GameState,
  card: Card,
  target: FieldPosition | undefined,
  handIndex: number
): Result<HandlerSuccess> {
  switch (card.type) {
    case "unit": return deployUnit(state, card, target);
    case "weapon": return deployWeapon(state, card, target);
    case "support": return deploySupport(state, card, handIndex);
    case "item":
    case "tactic": return deployItemOrTactic(state, card, target, handIndex);
  }
}
