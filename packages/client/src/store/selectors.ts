/**
 * Mode-agnostic selectors over the game store.
 *
 * The same UI code works in local, AI, and online modes. These selectors
 * hide the mode-specific details (gameState vs gameView) behind uniform
 * getters.
 */
import type { Player } from "@cards/shared";
import { currentPlayer, opposingPlayer } from "@cards/battle-engine";
import type { useGameStore } from "./gameStore";

type StoreState = ReturnType<typeof useGameStore.getState>;

/** Shape of opponent info the UI needs. Abstracts local Player vs online GameView.opponent. */
export interface OpponentInfo {
  name: string;
  field: Player["field"];
  handCount: number;
  deckCount: number;
  discardCount: number;
  energy: number;
  maxEnergy: number;
}

/** The current human player's Player record, regardless of mode. */
export function getCurrentPlayer(store: StoreState): Player | null {
  const { mode, gameState, gameView } = store;
  if ((mode === "local" || mode === "ai") && gameState) {
    // In AI mode, the human is always player 0.
    return mode === "ai" ? gameState.players[0] : currentPlayer(gameState);
  }
  if (mode === "online" && gameView) {
    return gameView.you;
  }
  return null;
}

/** Opponent info, normalized across modes. */
export function getOpponentInfo(store: StoreState): OpponentInfo | null {
  const { mode, gameState, gameView } = store;
  if ((mode === "local" || mode === "ai") && gameState) {
    const opp = mode === "ai" ? gameState.players[1] : opposingPlayer(gameState);
    return {
      name: opp.name,
      field: opp.field,
      handCount: opp.hand.length,
      deckCount: opp.deck.length,
      discardCount: opp.discardPile.length,
      energy: opp.energy,
      maxEnergy: opp.maxEnergy,
    };
  }
  if (mode === "online" && gameView) {
    const opp = gameView.opponent;
    return {
      name: opp.name,
      field: opp.field,
      handCount: opp.handCount,
      deckCount: opp.deckCount,
      discardCount: opp.discardCount,
      energy: opp.energy,
      maxEnergy: opp.maxEnergy,
    };
  }
  return null;
}

/** True when the human is allowed to take actions right now. */
export function getIsMyTurn(store: StoreState): boolean {
  // Hot-seat: always "your turn" regardless of whose turn the engine thinks it is.
  if (store.mode === "local") return true;
  if (store.mode === "ai" && store.gameState) return store.gameState.currentPlayerIndex === 0;
  if (store.mode === "online" && store.gameView) return store.gameView.isYourTurn;
  return false;
}

export function getTurnNumber(store: StoreState): number {
  if ((store.mode === "local" || store.mode === "ai") && store.gameState) return store.gameState.turnNumber;
  if (store.mode === "online" && store.gameView) return store.gameView.turnNumber;
  return 0;
}

export function getWinner(store: StoreState): string | null {
  if ((store.mode === "local" || store.mode === "ai") && store.gameState) return store.gameState.winner;
  if (store.mode === "online" && store.gameView) return store.gameView.winner;
  return null;
}
