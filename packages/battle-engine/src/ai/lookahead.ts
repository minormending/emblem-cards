/**
 * Depth-2 opponent-reply lookahead used by the "expert" preset.
 *
 * For a given candidate action:
 *   1. Clone the game state.
 *   2. Apply the action to the clone.
 *   3. Score the resulting state from the OPPONENT's perspective (their
 *      single best reply, greedy).
 *   4. Subtract that reply-score from the candidate's own score.
 *
 * This does NOT recurse further — one ply only. `executeAITurn` caps the
 * number of candidates passed to this helper (see aiPlayer.ts) so runtime
 * stays bounded.
 */
import type { GameState } from "@cards/shared";
import { deployCard, attackAction } from "../game.js";
import { scoreAllActions, type AIAction } from "./evaluate.js";

/**
 * Deep-clone a GameState. We rely on structured cloning via JSON round-trip
 * — the state is plain data (no class instances, no Dates, no functions on
 * cards) per the pure-data convention of this engine.
 */
function cloneState(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

/**
 * Apply an AIAction to a cloned state. Returns true on success; false if
 * the engine rejected the action (in which case the caller should discard
 * this branch as invalid rather than using a half-applied state).
 */
function applyAction(state: GameState, action: AIAction): boolean {
  if (action.type === "deploy") {
    return deployCard(state, action.handIndex, action.target).ok;
  }
  return attackAction(state, action.from, action.to).ok;
}

/**
 * Score an action with one ply of opponent reply baked in.
 *
 * Returns `action.score - bestOpponentReplyScore`. An opponent who has
 * no useful reply (empty board, nothing scored above 0) contributes 0,
 * leaving the base score unchanged.
 */
export function scoreWithLookahead(state: GameState, action: AIAction): number {
  const clone = cloneState(state);
  if (!applyAction(clone, action)) return action.score;

  // If the action won the game, no opponent reply matters.
  if (clone.winner) return action.score;

  // Swap perspective to the opponent and score their greedy best reply.
  clone.currentPlayerIndex = (clone.currentPlayerIndex === 0 ? 1 : 0) as 0 | 1;
  const replies = scoreAllActions(clone);
  if (replies.length === 0) return action.score;

  replies.sort((a, b) => b.score - a.score);
  const bestReply = replies[0];
  // Only penalize if the opponent actually has a positive-score response.
  const replyScore = Math.max(0, bestReply.score);
  return action.score - replyScore;
}
