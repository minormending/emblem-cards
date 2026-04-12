import type { GameEvent, GameState } from "@cards/shared";
import { AI_MAX_ACTIONS_PER_TURN } from "@cards/shared";
import { deployCard, attackAction } from "../game.js";
import { pickBestAction, type AIAction } from "./evaluate.js";

export interface AITurnResult {
  /** The high-level actions the AI chose (one per iteration). */
  actions: AIAction[];
  /** Flat list of every GameEvent emitted across the whole turn. */
  events: GameEvent[];
}

/**
 * Run an AI turn to completion.
 *
 * Picks the highest-scored action, executes it, and repeats until nothing is
 * worth doing (or the safety cap is hit). The caller is responsible for
 * calling endTurn afterwards — this function only does "during-turn" actions.
 */
export function executeAITurn(state: GameState): AITurnResult {
  const actions: AIAction[] = [];
  const events: GameEvent[] = [];

  for (let i = 0; i < AI_MAX_ACTIONS_PER_TURN; i++) {
    const action = pickBestAction(state);
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
