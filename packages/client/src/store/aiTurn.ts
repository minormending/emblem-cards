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
import { appendMatchEvents } from "./actions/local";
import { useFxStore, isMagicalAttack } from "./fxStore";
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
  appendMatchEvents(store, events);

  const show = store.getState().showMessage;

  // Item/tactic damage (Bolting, Meteor) also produces unit_damaged events.
  spawnCombatFx(gs, events);

  if (action.type === "deploy") {
    sfx.deploy();
    if (preText) show(preText);
    return;
  }

  // Attack — surface outgoing damage, counter damage, shakes, and KOs.
  sfx.attack();

  const damageEvents = events.filter(
    (e): e is Extract<GameEvent, { kind: "unit_damaged" }> => e.kind === "unit_damaged",
  );
  if (damageEvents.length > 0) {
    show(`AI deals ${damageEvents[0].amount} damage`);
    const counter = damageEvents.find((e) => e.isCounter);
    if (counter) {
      setTimeout(() => show(`counter: ${counter.amount}`), 450);
    }
  }

  // Shake only the enemy (AI) side from the viewer's perspective — counter
  // damage lands on the AI's attacker.
  for (const e of damageEvents) {
    if (e.isCounter) triggerShake(store, e.position);
  }
  // And the original target (human's unit).
  triggerShake(store, action.to);

  const koCount = events.filter((e) => e.kind === "unit_ko").length;
  if (koCount > 0) {
    setTimeout(() => sfx.ko(), 150);
    if (koCount > 1) setTimeout(() => sfx.ko(), 400);
  }
}

/**
 * Spawn transient combat VFX for every unit_damaged event. Viewer is always
 * player 0 in AI mode, so:
 *   - outgoing hits (AI → human) land on the viewer's own field
 *   - counters (human → AI) land on the enemy field
 *   - tactic damage from AI (damage_target on human unit) lands on own field
 */
function spawnCombatFx(state: GameState, events: GameEvent[]): void {
  const spawn = useFxStore.getState().spawn;
  const currentIndex = state.currentPlayerIndex;
  for (const e of events) {
    if (e.kind !== "unit_damaged") continue;
    // Defender index: counter hits the current player; otherwise the opponent.
    const defenderIndex = e.isCounter ? currentIndex : currentIndex === 0 ? 1 : 0;
    const side = defenderIndex === 0 ? "own" : "enemy";
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

/** End the AI's turn and hand control back to the player. */
function finishAITurn(store: Store, gs: GameState): void {
  if (gs.winner) {
    store.setState({ gameState: { ...gs } });
    return;
  }
  const endEvents = endTurn(gs);
  useLogStore.getState().addFromEvents(gs, endEvents);
  appendMatchEvents(store, endEvents);
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
