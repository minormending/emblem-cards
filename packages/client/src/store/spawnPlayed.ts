import type { GameEvent } from "@cards/shared";
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
