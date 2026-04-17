import type { Card } from "../types.js";

/**
 * Difficulty preset keys referenced by opponent definitions. Concrete
 * scoring/behavior lives in @cards/battle-engine (src/ai/presets.ts).
 */
export type AIDifficulty = "easy" | "medium" | "hard" | "expert";

/**
 * One rung of the tournament ladder. Static data — authored in
 * @cards/shared/src/tournament/opponents.ts and referenced by ID.
 *
 * Deck is stored as card IDs (resolved at battle-entry time via
 * getCardById), NOT full Card objects — keeps static data compact
 * and means card edits don't require re-authoring opponents.
 */
export interface TournamentOpponent {
  /** Stable slug, e.g. "recruit-gareth". Used as React key + save ref. */
  id: string;
  /** 1..8 — position in ladder. */
  order: number;
  displayName: string;
  /** Short archetype tag, e.g. "flying". Drives UI icon/grouping. */
  archetype: string;
  /** One sentence, no story — e.g. "Specializes in sky-borne pressure." */
  blurb: string;
  /** Card IDs. Must resolve via getCardById and pass deck validation. */
  deck: readonly string[];
  /** Named preset key from @cards/battle-engine AI_PRESETS. */
  ai: AIDifficulty;
  /** Card ID granted on victory. Must not appear in STARTER_POOL. */
  rewardCardId: string;
}

/**
 * Persisted tournament progress. One save slot per device.
 *
 * Storage key: "emblem-tournament/v1"
 *   - web:    localStorage via packages/client/src/lib/tournament.ts
 *   - mobile: AsyncStorage  via packages/mobile/src/lib/tournament.ts
 *
 * `tournamentDeck` holds full Card objects (not IDs) to match the
 * existing decks.ts persistence shape — callers shouldn't need to
 * re-resolve the catalog to render the last-used deck.
 */
export interface TournamentState {
  version: 1;
  /**
   * Index (0..8) of the next unbeaten opponent. 8 = champion cleared.
   * Opponent at `order === currentRound + 1` is the one to fight next.
   */
  currentRound: number;
  /** Card IDs unlocked via wins, beyond STARTER_POOL. No duplicates. */
  unlockedCards: readonly string[];
  /** Last saved deck for the tournament. Null until the player builds one. */
  tournamentDeck: Card[] | null;
  /** Increments when opponent #8 is beaten. */
  timesCompleted: number;
  /** ms epoch — updated on every save. */
  lastUpdatedAt: number;
}

/**
 * Initial save state for a fresh tournament or after a full reset.
 * Exported as a helper so client and mobile share the same starting
 * shape and don't drift.
 */
export function freshTournamentState(): TournamentState {
  return {
    version: 1,
    currentRound: 0,
    unlockedCards: [],
    tournamentDeck: null,
    timesCompleted: 0,
    lastUpdatedAt: Date.now(),
  };
}
