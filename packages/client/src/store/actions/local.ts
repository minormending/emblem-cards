/**
 * Local-mode action implementations.
 *
 * Used for "local" (hot-seat) and "ai" modes. Runs the battle-engine
 * directly in the browser, then pushes the updated state into the store.
 *
 * Side effects:
 *   - sfx (deploy/attack/ko/endTurn/error)
 *   - toast messages (damage, errors)
 *   - log entries (automatically derived from the engine's returned events)
 *   - lastHitPos (shake animation on hit slot)
 *
 * Logging is event-driven: the engine returns a list of GameEvents, and
 * `useLogStore.addFromEvents` maps each event to a log entry. No duplication
 * of "what happened" logic between engine and log.
 */
import type { FieldPosition } from "@cards/shared";
import { formatError, isErr, err, ErrorCode } from "@cards/shared";
import {
  attackAction,
  deployCard,
  drawPhase,
  endTurn,
} from "@cards/battle-engine";
import type { useGameStore } from "../gameStore";
import { useLogStore } from "../logStore";
import { sfx } from "../../lib/sounds";
import { scheduleAITurn } from "../aiTurn";
import type { GameActions } from "./types";

type Store = typeof useGameStore;

export function createLocalActions(store: Store): GameActions {
  return {
    deploy(handIndex, target) {
      const state = store.getState();
      const { gameState, mode } = state;
      if (!gameState) return fail(state, err(ErrorCode.NOT_IN_GAME));
      if (mode === "ai" && gameState.currentPlayerIndex !== 0) {
        return fail(state, err(ErrorCode.NOT_YOUR_TURN));
      }

      const result = deployCard(gameState, handIndex, target);
      if (isErr(result)) {
        sfx.error();
        state.showMessage(formatError(result.error));
      } else {
        sfx.deploy();
        useLogStore.getState().addFromEvents(gameState, result.value);
      }
      store.setState({ gameState: { ...gameState }, selectedHandIndex: null });
    },

    attack(from, to) {
      const state = store.getState();
      const { gameState, mode } = state;
      if (!gameState) return fail(state, err(ErrorCode.NOT_IN_GAME));
      if (mode === "ai" && gameState.currentPlayerIndex !== 0) {
        return fail(state, err(ErrorCode.NOT_YOUR_TURN));
      }

      const result = attackAction(gameState, from, to);

      if (isErr(result)) {
        sfx.error();
        state.showMessage(formatError(result.error));
      } else {
        sfx.attack();
        const events = result.value;

        // Log + toast
        useLogStore.getState().addFromEvents(gameState, events);
        const damageEvent = events.find((e) => e.kind === "unit_damaged");
        if (damageEvent?.kind === "unit_damaged") {
          state.showMessage(`${damageEvent.amount} damage!`);
        }

        // Animations
        triggerShake(store, to);
        if (events.some((e) => e.kind === "unit_ko")) {
          setTimeout(() => sfx.ko(), 150);
        }
      }

      store.setState({ gameState: { ...gameState }, selectedAttackerPos: null });
    },

    endTurn() {
      const state = store.getState();
      const { gameState, mode } = state;
      if (!gameState) return;

      sfx.endTurn();
      const events = endTurn(gameState);
      useLogStore.getState().addFromEvents(gameState, events);

      const drew = drawPhase(gameState);
      if (drew.ok) useLogStore.getState().addFromEvents(gameState, []); // no-op; draw events handled inside endTurn if any

      store.setState({
        gameState: { ...gameState },
        selectedHandIndex: null,
        selectedAttackerPos: null,
      });

      // Hand off to the AI if it's now its turn
      if (mode === "ai" && gameState.currentPlayerIndex === 1 && !gameState.winner) {
        scheduleAITurn(store);
      }
    },
  };
}

// ── Helpers ──

function fail(state: ReturnType<Store["getState"]>, e: ReturnType<typeof err>): void {
  sfx.error();
  state.showMessage(formatError(e.error));
}

/** Set lastHitPos long enough to trigger the shake animation, then clear. */
function triggerShake(store: Store, pos: FieldPosition): void {
  store.getState().setLastHitPos(pos);
  setTimeout(() => store.getState().setLastHitPos(null), 400);
}
