/**
 * Run the AI opponent's turn — one action at a time.
 *
 * Scheduled from the local `endTurn` action when it's now the AI's turn. The
 * first action fires after AI_TURN_DELAY_MS; each subsequent action fires
 * AI_ACTION_DELAY_MS later. Pacing the actions lets the player actually see
 * each deploy land and each attack happen, instead of watching the board
 * jump from pre-turn to post-turn in one frame.
 *
 * Each action gets the same visual treatment a human player's action does:
 *   - deploy: SFX + "AI deploys {name}" toast
 *   - attack: SFX + "AI deals N damage" toast + shake on the hit slot + KO sfx
 *
 * The AI's *reasoning* (scoring breakdown) still goes to console.debug only —
 * surfacing it in the UI would be overwhelming.
 */
import type { FieldPosition, GameEvent, GameState } from "@cards/shared";
import { AI_ACTION_DELAY_MS, AI_MAX_ACTIONS_PER_TURN, AI_TURN_DELAY_MS } from "@cards/shared";
import {
  attackAction,
  currentPlayer,
  deployCard,
  drawPhase,
  endTurn,
  explainAction,
  pickBestAction,
} from "@cards/battle-engine";
import type { AIAction } from "@cards/battle-engine";
import type { useGameStore } from "./gameStore";
import { useLogStore } from "./logStore";
import { sfx } from "../lib/sounds";

type Store = typeof useGameStore;

/** Schedule the AI turn to start after AI_TURN_DELAY_MS. */
export function scheduleAITurn(store: Store): void {
  setTimeout(() => startAITurn(store), AI_TURN_DELAY_MS);
}

function startAITurn(store: Store): void {
  const state = store.getState();
  if (!canAIAct(state)) return;

  const gs = state.gameState!;
  useLogStore.getState().addEntry({
    turn: gs.turnNumber,
    player: gs.players[gs.currentPlayerIndex].name,
    type: "system",
    text: "AI is thinking...",
  });

  runNextAction(store, 0);
}

/**
 * Pick the next best action, execute it, show it to the player, then
 * recurse after AI_ACTION_DELAY_MS. When no more actions are worth taking
 * (or the safety cap is hit), end the AI's turn.
 */
function runNextAction(store: Store, iteration: number): void {
  const state = store.getState();
  if (!canAIAct(state)) return;

  const gs = state.gameState!;

  if (iteration >= AI_MAX_ACTIONS_PER_TURN) {
    finishAITurn(store, gs);
    return;
  }

  const action = pickBestAction(gs);
  if (!action) {
    finishAITurn(store, gs);
    return;
  }

  // Capture the toast text BEFORE mutating state — deploy consumes the hand slot.
  const toastText = describeActionBefore(gs, action);

  const events = executeAction(gs, action);
  if (events === null) {
    // Action was picked but failed to execute (should be rare — usually means
    // the AI scored something illegal). Bail out and end the turn.
    finishAITurn(store, gs);
    return;
  }

  // Dev-only reasoning trace.
  console.debug("[AI]", action.type, explainAction(action));

  applyActionFx(store, gs, action, events, toastText);
  store.setState({ gameState: { ...gs } });

  if (gs.winner) return;

  setTimeout(() => runNextAction(store, iteration + 1), AI_ACTION_DELAY_MS);
}

/** Execute an AIAction against the engine. Returns the event list, or null on failure. */
function executeAction(gs: GameState, action: AIAction): GameEvent[] | null {
  if (action.type === "deploy") {
    const result = deployCard(gs, action.handIndex, action.target);
    return result.ok ? result.value : null;
  }
  const result = attackAction(gs, action.from, action.to);
  return result.ok ? result.value : null;
}

/**
 * Build a short user-facing toast describing what the AI is about to do.
 * For deploys we read the card name from the hand before it's consumed; for
 * attacks we'll wait and pull the damage number from the emitted event.
 */
function describeActionBefore(gs: GameState, action: AIAction): string | null {
  if (action.type === "deploy") {
    const card = currentPlayer(gs).hand[action.handIndex];
    if (!card) return null;
    return `AI plays ${card.name}`;
  }
  return null; // attack toast needs the post-event damage number
}

/** Play sfx, show a toast, trigger shake — mirroring how a human action feels. */
function applyActionFx(
  store: Store,
  gs: GameState,
  action: AIAction,
  events: GameEvent[],
  preText: string | null
): void {
  useLogStore.getState().addFromEvents(gs, events);

  const show = store.getState().showMessage;

  if (action.type === "deploy") {
    sfx.deploy();
    if (preText) show(preText);
    return;
  }

  // Attack
  sfx.attack();
  const damage = events.find((e) => e.kind === "unit_damaged");
  if (damage?.kind === "unit_damaged") {
    show(`AI deals ${damage.amount} damage`);
  }
  triggerShake(store, action.to);
  if (events.some((e) => e.kind === "unit_ko")) {
    setTimeout(() => sfx.ko(), 150);
  }
}

/** End the AI's turn and hand control back to the player. */
function finishAITurn(store: Store, gs: GameState): void {
  if (gs.winner) {
    store.setState({ gameState: { ...gs } });
    return;
  }
  const endEvents = endTurn(gs);
  useLogStore.getState().addFromEvents(gs, endEvents);
  drawPhase(gs);
  store.setState({ gameState: { ...gs } });
}

/** True if the store is still in a valid state for the AI to act. */
function canAIAct(state: ReturnType<Store["getState"]>): boolean {
  if (state.mode !== "ai") return false;
  if (!state.gameState) return false;
  if (state.gameState.winner) return false;
  return state.gameState.currentPlayerIndex === 1;
}

/** Shake animation on the hit slot, same as in the player's attack path. */
function triggerShake(store: Store, pos: FieldPosition): void {
  store.getState().setLastHitPos(pos);
  setTimeout(() => store.getState().setLastHitPos(null), 400);
}
