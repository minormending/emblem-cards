import type { GameEvent, GameState } from "@cards/shared";
import { useFxStore } from "./fxStore";

/**
 * Walk a batch of events and fire card-played overlays for the non-unit plays
 * (items/tactics, weapons, supports). Used by every action path — local mode
 * engine calls, AI turn runner, and socket listeners for online mode.
 *
 * `ownerSide` tells the overlay whose play this is from the viewer's
 * perspective; null means "I don't know" (fall through to the "no prefix"
 * label).
 */
export function spawnPlayedFromEvents(
  events: GameEvent[],
  ownerSide: "own" | "enemy" | null,
): void {
  const spawn = useFxStore.getState().spawnPlayedCard;
  for (const ev of events) {
    if (ev.kind === "item_played") {
      spawn({ kind: "item", card: ev.card });
    } else if (ev.kind === "weapon_equipped") {
      spawn({ kind: "weapon", card: ev.weapon, ownerSide: ownerSide ?? "own" });
    } else if (ev.kind === "support_activated") {
      spawn({ kind: "support", card: ev.support, ownerSide: ownerSide ?? "own" });
    }
  }
}

/**
 * Spotlight the slots an action applies to, so the viewer's eye is drawn from
 * the center-screen card to the relevant slot(s). Takes a local GameState so
 * we can resolve position ownership precisely (which side owns the target).
 *
 * `viewerSide` tells us whose field is the viewer looking at as "own":
 *   - local / AI mode: usually the current player (or P1 for hot-seat)
 *   - online: the authenticated player
 *
 * `actorSide` is which side played the card — "own" when the viewer played,
 * "enemy" when the opponent played. Used for weapons/deploys (always land on
 * the actor's own field).
 */
export function spawnSpotlightsFromEvents(
  events: GameEvent[],
  state: GameState,
  viewerId: string,
  actorSide: "own" | "enemy",
): void {
  const spawn = useFxStore.getState().spawnSpotlight;
  for (const ev of events) {
    if (ev.kind === "weapon_equipped" || ev.kind === "unit_deployed") {
      // Equips and deploys always land on the actor's own field.
      spawn({ side: actorSide, pos: ev.position });
    } else if (
      ev.kind === "unit_damaged" ||
      ev.kind === "unit_healed" ||
      ev.kind === "unit_buffed"
    ) {
      // Effects target a specific position — figure out whose field it's on
      // by asking the game state which player has a unit there.
      const side = sideForPosition(state, viewerId, ev.position);
      if (side) spawn({ side, pos: ev.position });
    }
  }
}

/**
 * Same spotlight logic for online mode where we don't have the full GameState
 * locally — rely on event metadata instead. For damage/heal/buff, use the
 * attackerOwner field (if present) to invert whose side the target is on.
 */
export function spawnSpotlightsFromEventsOnline(
  events: GameEvent[],
  viewerId: string,
  actorId: string | null,
): void {
  const spawn = useFxStore.getState().spawnSpotlight;
  const actorSide: "own" | "enemy" = actorId === viewerId ? "own" : "enemy";

  for (const ev of events) {
    if (ev.kind === "weapon_equipped" || ev.kind === "unit_deployed") {
      spawn({ side: actorSide, pos: ev.position });
    } else if (ev.kind === "unit_damaged") {
      // Damage events always carry attackerOwner for combat-sourced damage.
      // For item damage the attackerOwner is missing; fall back to assuming
      // the actor is attacking the opposite side.
      const attackerOwner = ev.attackerOwner ?? actorId;
      const targetSide: "own" | "enemy" = attackerOwner === viewerId ? "enemy" : "own";
      spawn({ side: targetSide, pos: ev.position });
    } else if (ev.kind === "unit_healed" || ev.kind === "unit_buffed") {
      // Buffs/heals usually apply to the actor's own units.
      spawn({ side: actorSide, pos: ev.position });
    }
  }
}

/** Which field side is the unit at `pos` on, from the viewer's perspective? */
function sideForPosition(
  state: GameState,
  viewerId: string,
  pos: { row: "front" | "back"; col: 0 | 1 | 2 },
): "own" | "enemy" | null {
  for (const player of state.players) {
    const slot = player.field[pos.row][pos.col];
    if (slot.unit) {
      return player.id === viewerId ? "own" : "enemy";
    }
  }
  return null;
}
