import type { GameState } from "@cards/shared";
import { getOccupiedPositions } from "./field.js";

/**
 * Determine whether the game has ended.
 *
 * Returns the winner's player ID, or null if the game is still in progress.
 *
 * Victory conditions (checked for each player as "attacker" of the win):
 *   1. Lord KO — the opposing Lord is in the discard pile.
 *   2. Rout — the opponent has no units on the field AND no unit cards in
 *      their hand or deck (they can't possibly get more units).
 *
 * Deck-out (opponent cannot draw and has no units) is also a win, but that's
 * checked during endTurn rather than here, because it's a turn-transition event.
 */
export function checkWinCondition(state: GameState): string | null {
  for (let i = 0; i < 2; i++) {
    const player = state.players[i];
    const opponent = state.players[i === 0 ? 1 : 0];

    // Rout: opponent has no units anywhere
    if (getOccupiedPositions(opponent.field).length === 0) {
      const hasUnitsLeft = [...opponent.hand, ...opponent.deck].some(
        (c) => c.type === "unit"
      );
      if (!hasUnitsLeft) return player.id;
    }

    // Lord KO: opposing lord is dead (was pushed to their discard)
    const lordKO = opponent.discardPile.some(
      (c) => c.type === "unit" && c.isLord
    );
    if (lordKO) return player.id;
  }

  return null;
}
