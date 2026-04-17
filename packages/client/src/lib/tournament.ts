import type { TournamentState } from "@cards/shared";
import { freshTournamentState } from "@cards/shared";

const TOURNAMENT_KEY = "emblem-tournament/v1";
const CURRENT_VERSION = 1;

/**
 * Persist the player's tournament progress (currentRound, unlockedCards,
 * tournamentDeck, timesCompleted). Mirrors the mobile implementation at
 * packages/mobile/src/lib/tournament.ts, but backed by localStorage instead
 * of AsyncStorage — sync where mobile is async.
 *
 * Version mismatches and corrupt JSON fall back to a fresh tournament —
 * progress is always replayable so no data-loss concern.
 */
export function loadTournament(): TournamentState {
  try {
    const raw = localStorage.getItem(TOURNAMENT_KEY);
    if (!raw) return freshTournamentState();
    const parsed = JSON.parse(raw) as Partial<TournamentState>;
    if (parsed.version !== CURRENT_VERSION) return freshTournamentState();
    if (
      typeof parsed.currentRound !== "number" ||
      !Array.isArray(parsed.unlockedCards) ||
      typeof parsed.timesCompleted !== "number"
    ) {
      return freshTournamentState();
    }
    // tournamentDeck may be null or an array of cards.
    if (parsed.tournamentDeck !== null && !Array.isArray(parsed.tournamentDeck)) {
      return freshTournamentState();
    }
    return {
      version: CURRENT_VERSION,
      currentRound: parsed.currentRound,
      unlockedCards: parsed.unlockedCards,
      tournamentDeck: parsed.tournamentDeck ?? null,
      timesCompleted: parsed.timesCompleted,
      lastUpdatedAt: typeof parsed.lastUpdatedAt === "number" ? parsed.lastUpdatedAt : Date.now(),
    };
  } catch {
    return freshTournamentState();
  }
}

export function saveTournament(state: TournamentState): void {
  try {
    const snap: TournamentState = {
      ...state,
      version: CURRENT_VERSION,
      lastUpdatedAt: Date.now(),
    };
    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(snap));
  } catch {
    // Quota hit, Safari private mode, etc — tournament stays live in memory only.
  }
}

/**
 * Wipes all tournament data. NEXT `loadTournament()` returns a fresh state.
 */
export function resetTournament(): void {
  try {
    localStorage.removeItem(TOURNAMENT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Replay mode: keeps unlockedCards + timesCompleted, resets currentRound to 0
 * and clears tournamentDeck. Lets the player run the ladder again without
 * losing their collection.
 */
export function replayTournament(): void {
  try {
    const current = loadTournament();
    const next: TournamentState = {
      version: CURRENT_VERSION,
      currentRound: 0,
      unlockedCards: current.unlockedCards,
      tournamentDeck: null,
      timesCompleted: current.timesCompleted,
      lastUpdatedAt: Date.now(),
    };
    localStorage.setItem(TOURNAMENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
