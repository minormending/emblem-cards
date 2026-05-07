/**
 * AI difficulty presets for Tournament mode.
 *
 * Four named configs consumed by `executeAITurn`. Each preset tweaks the
 * existing scoring/selection pipeline via a small set of knobs — see
 * `AIConfig` and docs/TOURNAMENT_MODE.md §4 for semantics.
 *
 * Threshold numbers below are chosen relative to the legacy
 * `SCORING.MIN_ACTION_SCORE = 0` used by `pickBestAction`:
 *   - loose  = -5 (plays borderline / wimpy actions hard AI would skip)
 *   - default = 0 (unchanged — matches current behavior)
 *   - strict = +5 (easy AI passes on marginal plays, feels sloppy)
 *
 * Note the semantic inversion vs plan §4 prose: plan describes easy as
 * "lenient (skips more turns)" and hard as "strict (plays every useful
 * action)". The `scoreThreshold` field comment reflects this — LOWER
 * threshold = AI acts more (hard), HIGHER threshold = passes more (easy).
 */
import type { AIDifficulty } from "@cards/shared";

export interface AIConfig {
  /** 1 = greedy. 2 = one-ply opponent-reply lookahead. No deeper. */
  searchDepth: 1 | 2;
  /** Sample uniformly among the top-K actions exceeding threshold. */
  topK: number;
  /** Multiplier applied to the "damage-to-enemy/enemy-Lord" component of the score. */
  aggressionWeight: number;
  /** Minimum action score required to be taken. Lower = AI acts more; higher = passes more. */
  scoreThreshold: number;
}

export const AI_PRESETS: Record<AIDifficulty, AIConfig> = {
  easy: {
    searchDepth: 1,
    topK: 3,
    aggressionWeight: 0.6,
    scoreThreshold: 5, // lenient = skips marginal plays
  },
  medium: {
    searchDepth: 1,
    topK: 2,
    aggressionWeight: 1.0,
    scoreThreshold: 0, // current default — matches legacy behavior
  },
  hard: {
    searchDepth: 1,
    topK: 1,
    aggressionWeight: 1.2,
    scoreThreshold: -5, // strict = plays every useful action
  },
  expert: {
    searchDepth: 2,
    topK: 1,
    aggressionWeight: 1.2,
    scoreThreshold: -5, // strict = plays every useful action, plus 1-ply lookahead
  },
};

/**
 * Default config used when `executeAITurn` is called without one. Matches
 * the pre-preset behavior exactly — greedy, top-1, no aggression reweighting,
 * threshold 0 — so existing callers/tests are unaffected.
 */
export const DEFAULT_AI_CONFIG: AIConfig = {
  searchDepth: 1,
  topK: 1,
  aggressionWeight: 1.0,
  scoreThreshold: 0,
};
