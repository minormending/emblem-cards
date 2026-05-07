import type { FieldPosition, GameEvent, GameState } from '@cards/shared';
import {
  AI_ACTION_DELAY_MS,
  AI_MAX_ACTIONS_PER_TURN,
  AI_TURN_DELAY_MS,
} from '@cards/shared';
import {
  AI_PRESETS,
  DEFAULT_AI_CONFIG,
  aggressionComponent,
  attackAction,
  currentPlayer,
  deployCard,
  drawPhase,
  endTurn,
  explainAction,
  pickBestAction,
  scoreAllActions,
  scoreWithLookahead,
} from '@cards/battle-engine';
import type { AIAction, AIConfig } from '@cards/battle-engine';
import type { useGameStore } from './gameStore';
import { useLogStore } from './logStore';
import { appendMatchEvents } from './actions/local';
import { spawnPlayedFromEvents, spawnSpotlightsFromEvents } from './spawnPlayed';
import { useFxStore, isMagicalAttack } from './fxStore';
import { sfx } from '../lib/sounds';

type Store = typeof useGameStore;

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
    type: 'system',
    text: 'AI is thinking...',
  });
  runNextAction(store, 0);
}

function runNextAction(store: Store, iteration: number): void {
  const state = store.getState();
  if (!canAIAct(state)) return;
  const gs = state.gameState!;
  if (iteration >= AI_MAX_ACTIONS_PER_TURN) {
    finishAITurn(store, gs);
    return;
  }
  const action = pickNextAction(state, gs);
  if (!action) {
    finishAITurn(store, gs);
    return;
  }
  const toastText = describeActionBefore(gs, action);
  const events = executeAction(gs, action);
  if (events === null) {
    finishAITurn(store, gs);
    return;
  }
  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[AI]', action.type, explainAction(action));
  }
  applyActionFx(store, gs, action, events, toastText);
  store.setState({ gameState: { ...gs } });
  if (gs.winner) return;
  setTimeout(() => runNextAction(store, iteration + 1), AI_ACTION_DELAY_MS);
}

function executeAction(gs: GameState, action: AIAction): GameEvent[] | null {
  try {
    if (action.type === 'deploy') {
      const result = deployCard(gs, action.handIndex, action.target);
      return result.ok ? result.value : null;
    }
    const result = attackAction(gs, action.from, action.to);
    return result.ok ? result.value : null;
  } catch (err) {
    // Engine invariant violation inside the AI path shouldn't take down the
    // whole app. Surface in console, bail out, and let the AI pass its turn.
    if (typeof console !== 'undefined' && console.error) {
      console.error('[AI] engine threw while executing action', action, err);
    }
    return null;
  }
}

function describeActionBefore(gs: GameState, action: AIAction): string | null {
  if (action.type === 'deploy') {
    const card = currentPlayer(gs).hand[action.handIndex];
    if (!card) return null;
    return `AI plays ${card.name}`;
  }
  return null;
}

function applyActionFx(
  store: Store,
  gs: GameState,
  action: AIAction,
  events: GameEvent[],
  preText: string | null,
): void {
  useLogStore.getState().addFromEvents(gs, events);
  appendMatchEvents(store, events);
  spawnPlayedFromEvents(events, 'enemy');
  spawnSpotlightsFromEvents(events, gs, gs.players[0].id, 'enemy');
  const show = store.getState().showMessage;
  spawnCombatFx(gs, events);
  if (action.type === 'deploy') {
    sfx.deploy();
    if (preText) show(preText);
    return;
  }
  sfx.attack();
  const damageEvents = events.filter(
    (e): e is Extract<GameEvent, { kind: 'unit_damaged' }> =>
      e.kind === 'unit_damaged',
  );
  if (damageEvents.length > 0) {
    show(`AI deals ${damageEvents[0].amount} damage`);
    const counter = damageEvents.find((e) => e.isCounter);
    if (counter) setTimeout(() => show(`counter: ${counter.amount}`), 450);
  }
  for (const e of damageEvents) {
    if (e.isCounter) triggerShake(store, e.position);
  }
  triggerShake(store, action.to);
  const koCount = events.filter((e) => e.kind === 'unit_ko').length;
  if (koCount > 0) {
    setTimeout(() => sfx.ko(), 150);
    if (koCount > 1) setTimeout(() => sfx.ko(), 400);
  }
}

function spawnCombatFx(state: GameState, events: GameEvent[]): void {
  const spawn = useFxStore.getState().spawn;
  const currentIndex = state.currentPlayerIndex;
  for (const e of events) {
    if (e.kind !== 'unit_damaged') continue;
    const defenderIndex = e.isCounter ? currentIndex : currentIndex === 0 ? 1 : 0;
    const side = defenderIndex === 0 ? 'own' : 'enemy';
    const attackType = e.attackerAttackType ?? null;
    spawn({
      side,
      pos: e.position,
      kind: isMagicalAttack(attackType) ? 'magical' : 'physical',
      attackType,
      amount: e.amount,
      isCounter: !!e.isCounter,
    });
  }
}

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

function canAIAct(state: ReturnType<Store['getState']>): boolean {
  if (state.mode !== 'ai' && state.mode !== 'tournament') return false;
  if (!state.gameState) return false;
  if (state.gameState.winner) return false;
  return state.gameState.currentPlayerIndex === 1;
}

/** Branch cap for depth-2 lookahead, mirrors engine-side LOOKAHEAD_BRANCH_CAP. */
const LOOKAHEAD_BRANCH_CAP = 6;

/**
 * Pick the next action the AI will take. In default AI mode this delegates
 * to `pickBestAction`. In tournament mode it honors the opponent's AIConfig
 * preset (top-K sampling, aggression weight, depth-2 lookahead).
 */
function pickNextAction(
  state: ReturnType<Store['getState']>,
  gs: GameState,
): AIAction | null {
  if (state.mode !== 'tournament' || !state.currentOpponent) {
    return pickBestAction(gs);
  }

  const config: AIConfig = AI_PRESETS[state.currentOpponent.ai] ?? DEFAULT_AI_CONFIG;
  const all = scoreAllActions(gs);
  if (all.length === 0) return null;

  const weighted = all.map((a) => ({
    action: a,
    score:
      config.aggressionWeight === 1
        ? a.score
        : a.score + (config.aggressionWeight - 1) * aggressionComponent(a),
  }));
  weighted.sort((a, b) => b.score - a.score);

  if (config.searchDepth === 2) {
    const branches = weighted.slice(0, LOOKAHEAD_BRANCH_CAP).map((w) => ({
      action: w.action,
      score: scoreWithLookahead(gs, w.action) + (w.score - w.action.score),
    }));
    branches.sort((a, b) => b.score - a.score);
    for (let i = 0; i < branches.length; i++) weighted[i] = branches[i];
  }

  const qualified = weighted.filter((w) => w.score > config.scoreThreshold);
  if (qualified.length === 0) return null;
  const k = Math.max(1, Math.min(config.topK, qualified.length));
  const idx = k === 1 ? 0 : Math.floor(Math.random() * k);
  return qualified[idx].action;
}

function triggerShake(store: Store, pos: FieldPosition): void {
  store.getState().setLastHitPos(pos);
  setTimeout(() => store.getState().setLastHitPos(null), 400);
}
