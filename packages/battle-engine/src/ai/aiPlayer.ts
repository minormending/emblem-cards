import type { GameEvent, GameState } from "@cards/shared";
import { AI_MAX_ACTIONS_PER_TURN } from "@cards/shared";
import { deployCard, attackAction } from "../game.js";
import {
  aggressionComponent,
  scoreAllActions,
  type AIAction,
} from "./evaluate.js";
import { type AIConfig, DEFAULT_AI_CONFIG } from "./presets.js";
import { scoreWithLookahead } from "./lookahead.js";

export interface AITurnResult {
  /** The high-level actions the AI chose (one per iteration). */
  actions: AIAction[];
  /** Flat list of every GameEvent emitted across the whole turn. */
  events: GameEvent[];
}

/** Cap on how many candidates the depth-2 lookahead will evaluate per loop. */
const LOOKAHEAD_BRANCH_CAP = 6;

/**
 * Simple seedable PRNG (mulberry32). Keeps top-K sampling deterministic
 * when callers pass a `rng` — used by tests. When no `rng` is supplied
 * we fall back to `Math.random` so live play stays non-deterministic.
 */
export type Rng = () => number;
export function makeRng(seed: number): Rng {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Apply the config's aggression weight to an action's score. The score
 * delta is `(aggressionWeight - 1) * aggressionComponent` so a weight of
 * 1.0 (default) is a no-op.
 */
function reweightForAggression(action: AIAction, config: AIConfig): number {
  if (config.aggressionWeight === 1) return action.score;
  const agg = aggressionComponent(action);
  return action.score + (config.aggressionWeight - 1) * agg;
}

/**
 * Pick the next action under the given config. Respects threshold, top-K
 * sampling, and depth-2 lookahead (expert only). Returns null when no
 * action is worth taking.
 */
function pickActionWithConfig(
  state: GameState,
  config: AIConfig,
  rng: Rng
): AIAction | null {
  const all = scoreAllActions(state);
  if (all.length === 0) return null;

  // 1. Apply aggression weighting to a local score.
  const weighted = all.map((a) => ({
    action: a,
    score: reweightForAggression(a, config),
  }));

  // 2. Sort by weighted score, descending.
  weighted.sort((a, b) => b.score - a.score);

  // 3. Depth-2 lookahead on the top branches (expert preset).
  if (config.searchDepth === 2) {
    const branches = weighted.slice(0, LOOKAHEAD_BRANCH_CAP).map((w) => ({
      action: w.action,
      score: scoreWithLookahead(state, w.action) +
        (w.score - w.action.score), // preserve the aggression delta
    }));
    branches.sort((a, b) => b.score - a.score);
    // Overwrite the head of the list with the lookahead-adjusted order.
    for (let i = 0; i < branches.length; i++) weighted[i] = branches[i];
  }

  // 4. Filter by threshold.
  const qualified = weighted.filter((w) => w.score > config.scoreThreshold);
  if (qualified.length === 0) return null;

  // 5. Top-K uniform sample.
  const k = Math.max(1, Math.min(config.topK, qualified.length));
  const idx = k === 1 ? 0 : Math.floor(rng() * k);
  return qualified[idx].action;
}

/**
 * Run an AI turn to completion.
 *
 * Picks the highest-scored action, executes it, and repeats until nothing is
 * worth doing (or the safety cap is hit). The caller is responsible for
 * calling endTurn afterwards — this function only does "during-turn" actions.
 *
 * `config` tunes difficulty — see `AI_PRESETS` in ./presets.ts. Omitting it
 * preserves legacy behavior (greedy, top-1, no aggression reweighting,
 * threshold 0) so existing callers and tests are unaffected.
 *
 * `rng` is used only when `config.topK > 1`; tests pass a seeded PRNG
 * (see `makeRng`) for deterministic top-K sampling.
 */
export function executeAITurn(
  state: GameState,
  config: AIConfig = DEFAULT_AI_CONFIG,
  rng: Rng = Math.random
): AITurnResult {
  const actions: AIAction[] = [];
  const events: GameEvent[] = [];

  for (let i = 0; i < AI_MAX_ACTIONS_PER_TURN; i++) {
    const action = pickActionWithConfig(state, config, rng);
    if (!action) break;

    if (action.type === "deploy") {
      const result = deployCard(state, action.handIndex, action.target);
      if (!result.ok) break;
      actions.push(action);
      events.push(...result.value);
    } else if (action.type === "attack") {
      const result = attackAction(state, action.from, action.to);
      if (!result.ok) break;
      actions.push(action);
      events.push(...result.value);
    }

    if (state.winner) break;
  }

  return { actions, events };
}
