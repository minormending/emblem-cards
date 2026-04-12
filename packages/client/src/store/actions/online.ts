/**
 * Online-mode action implementations.
 *
 * Fire-and-forget: each method emits a socket event. The server's response
 * (success broadcast as game:update, failures as game:error) is handled
 * by socketListeners.ts, which feeds back into the store.
 *
 * UI side effects (toast messages, lastHitPos) happen here only for the
 * fire-the-arrow moment. The server's response may overwrite them.
 */
import { getSocket } from "../socket";
import type { useGameStore } from "../gameStore";
import type { GameActions } from "./types";

type Store = typeof useGameStore;

export function createOnlineActions(store: Store): GameActions {
  return {
    deploy(handIndex, target) {
      if (!ensureInGame(store)) return;
      const socket = getSocket();
      socket.emit("game:deploy", handIndex, target);
      store.setState({ selectedHandIndex: null });
    },

    attack(from, to) {
      if (!ensureInGame(store)) return;
      const socket = getSocket();
      socket.emit("game:attack", from, to);
      store.setState({ selectedAttackerPos: null });
      // Optimistic shake — the server broadcasts the real result shortly.
      store.getState().setLastHitPos(to);
      setTimeout(() => store.getState().setLastHitPos(null), 400);
    },

    endTurn() {
      if (!ensureInGame(store)) return;
      const socket = getSocket();
      socket.emit("game:end-turn");
      store.setState({ selectedHandIndex: null, selectedAttackerPos: null });
    },
  };
}

function ensureInGame(store: Store): boolean {
  const state = store.getState();
  if (!state.gameView) {
    state.showMessage("Not in a game");
    return false;
  }
  const socket = getSocket();
  if (!socket.connected) {
    state.showMessage("Disconnected from server");
    return false;
  }
  return true;
}
