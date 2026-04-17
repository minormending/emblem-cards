import type { GameSocket } from "./socket";
import type { useGameStore } from "./gameStore";
import { spawnPlayedFromEvents } from "./spawnPlayed";
import { getPlayerId } from "../lib/identity";

type StoreApi = typeof useGameStore;

/**
 * Wire up all server → client socket event handlers.
 *
 * This function is idempotent — it clears any existing handlers before
 * attaching new ones, so it's safe to call multiple times (e.g., on reconnect).
 *
 * The handlers read/write the Zustand store via the imported `useGameStore`,
 * which means they always see the current state and don't capture stale refs.
 */
export function attachSocketListeners(socket: GameSocket, store: StoreApi): void {
  // Remove any previously-attached handlers so calling this twice doesn't
  // double-fire events.
  socket.off("queue:joined");
  socket.off("game:start");
  socket.off("game:update");
  socket.off("game:error");
  socket.off("game:action-result");
  socket.off("game:over");
  socket.off("auth:ok");
  socket.off("auth:error");
  socket.off("room:created");
  socket.off("room:error");

  socket.on("queue:joined", ({ position }) => {
    store.setState({ queuePosition: position });
  });

  socket.on("game:start", (view) => {
    store.setState({ gameView: view, screen: "battle" });
  });

  socket.on("game:update", (view) => {
    store.setState({ gameView: view });
  });

  socket.on("game:error", (message) => {
    store.getState().showMessage(message);
  });

  socket.on("game:action-result", (result) => {
    if (result.type === "attack" && result.damage != null) {
      store.getState().showMessage(`${result.damage} damage!`);
    }
    if (result.events && result.events.length > 0) {
      const side = result.actorId === getPlayerId() ? "own" : "enemy";
      spawnPlayedFromEvents(result.events, side);
    }
  });

  socket.on("game:over", ({ stats }) => {
    // Final state comes via game:update before this; attach stats for UI.
    store.setState({ matchStats: stats });
  });

  socket.on("room:created", ({ code }) => {
    store.setState({ roomCode: code });
  });

  socket.on("room:error", (message) => {
    store.getState().showMessage(message);
    store.setState({ screen: "deck-builder", roomRole: null, roomCode: null });
  });
}
