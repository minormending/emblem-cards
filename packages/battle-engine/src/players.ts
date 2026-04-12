import type { GameState, Player } from "@cards/shared";

/**
 * The player whose turn it currently is.
 * NOTE: returns a reference — mutations to this object mutate game state.
 */
export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/**
 * The other player (the opponent of the current player).
 * Like currentPlayer, this is a reference — be careful with mutations.
 */
export function opposingPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex === 0 ? 1 : 0];
}
