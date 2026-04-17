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
import type { FieldPosition, GameEvent, GameState } from "@cards/shared";
import { formatError, isErr, err, ErrorCode } from "@cards/shared";
import {
  attackAction,
  deployCard,
  drawPhase,
  endTurn,
} from "@cards/battle-engine";
import type { useGameStore } from "../gameStore";
import { useLogStore } from "../logStore";
import { useFxStore, isMagicalAttack } from "../fxStore";
import { spawnPlayedFromEvents, spawnSpotlightsFromEvents } from "../spawnPlayed";
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
        appendMatchEvents(store, result.value);
        // Item/tactic damage events also get VFX (e.g. Meteor, Bolting).
        spawnCombatFx(gameState, result.value, mode);
        // Center-screen flash for non-unit cards (items/weapons/supports).
        spawnPlayedFromEvents(result.value, "own");
        // Spotlight the target slot(s) so the viewer can follow card → impact.
        const viewerId = gameState.players[mode === "ai" ? 0 : gameState.currentPlayerIndex].id;
        spawnSpotlightsFromEvents(result.value, gameState, viewerId, "own");
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

        // Log
        useLogStore.getState().addFromEvents(gameState, events);
        appendMatchEvents(store, events);

        // Toast: primary hit + counter if present
        const damageEvents = events.filter(
          (e): e is Extract<GameEvent, { kind: "unit_damaged" }> => e.kind === "unit_damaged",
        );
        if (damageEvents.length > 0) {
          state.showMessage(`${damageEvents[0].amount} damage!`);
          const counter = damageEvents.find((e) => e.isCounter);
          if (counter) {
            setTimeout(() => state.showMessage(`counter: ${counter.amount}`), 450);
          }
        }

        // Visual effects — one instance per unit_damaged
        spawnCombatFx(gameState, events, mode);

        // Shake the slots that actually took damage (enemy side only — own
        // side already pulses from the FX overlay).
        for (const e of damageEvents) {
          const side = damageSide(gameState, e, mode);
          if (side === "enemy") triggerShake(store, e.position);
        }

        if (events.some((e) => e.kind === "unit_ko")) {
          setTimeout(() => sfx.ko(), 150);
          // second KO sfx when both sides die in the exchange
          if (events.filter((e) => e.kind === "unit_ko").length > 1) {
            setTimeout(() => sfx.ko(), 400);
          }
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
      appendMatchEvents(store, events);

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

export function appendMatchEvents(store: Store, events: GameEvent[]): void {
  if (events.length === 0) return;
  store.setState((s) => ({ matchEvents: [...s.matchEvents, ...events] }));
}

/** Set lastHitPos long enough to trigger the shake animation, then clear. */
function triggerShake(store: Store, pos: FieldPosition): void {
  store.getState().setLastHitPos(pos);
  setTimeout(() => store.getState().setLastHitPos(null), 400);
}

/**
 * Which field is this damage landing on — "own" (bottom of UI) or "enemy"
 * (top of UI) — from the viewer's perspective.
 *
 * Viewer rules:
 *   - AI mode: the human is always player 0.
 *   - Local hot-seat: the viewer is whoever is the current player.
 *
 * Then: outgoing hits the opponent of the current player; counter hits the
 * current player's own unit.
 */
function damageSide(
  state: GameState,
  event: Extract<GameEvent, { kind: "unit_damaged" }>,
  mode: string,
): "own" | "enemy" {
  const viewerIndex = mode === "ai" ? 0 : state.currentPlayerIndex;
  const currentIndex = state.currentPlayerIndex;
  const defenderIndex = event.isCounter
    ? currentIndex
    : currentIndex === 0
      ? 1
      : 0;
  return defenderIndex === viewerIndex ? "own" : "enemy";
}

function spawnCombatFx(
  state: GameState,
  events: GameEvent[],
  mode: string,
): void {
  const spawn = useFxStore.getState().spawn;
  for (const e of events) {
    if (e.kind !== "unit_damaged") continue;
    const side = damageSide(state, e, mode);
    const attackType = e.attackerAttackType ?? null;
    spawn({
      side,
      pos: e.position,
      kind: isMagicalAttack(attackType) ? "magical" : "physical",
      attackType,
      amount: e.amount,
      isCounter: !!e.isCounter,
    });
  }
}
