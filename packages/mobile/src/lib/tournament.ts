import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TournamentState } from '@cards/shared';
import { freshTournamentState } from '@cards/shared';

const TOURNAMENT_KEY = 'emblem-tournament/v1';
const CURRENT_VERSION = 1;

/**
 * Persist the player's tournament progress. Mirror of the web implementation
 * at packages/client/src/lib/tournament.ts, but backed by AsyncStorage — async
 * where web is sync.
 *
 * Version mismatches and corrupt JSON fall back to a fresh tournament — no
 * data-loss concern since progress is always replayable.
 */
export async function loadTournament(): Promise<TournamentState> {
  try {
    const raw = await AsyncStorage.getItem(TOURNAMENT_KEY);
    if (!raw) return freshTournamentState();
    const parsed = JSON.parse(raw) as Partial<TournamentState>;
    if (parsed.version !== CURRENT_VERSION) return freshTournamentState();
    if (
      typeof parsed.currentRound !== 'number' ||
      !Array.isArray(parsed.unlockedCards) ||
      typeof parsed.timesCompleted !== 'number'
    ) {
      return freshTournamentState();
    }
    if (parsed.tournamentDeck !== null && !Array.isArray(parsed.tournamentDeck)) {
      return freshTournamentState();
    }
    return {
      version: CURRENT_VERSION,
      currentRound: parsed.currentRound,
      unlockedCards: parsed.unlockedCards,
      tournamentDeck: parsed.tournamentDeck ?? null,
      timesCompleted: parsed.timesCompleted,
      lastUpdatedAt:
        typeof parsed.lastUpdatedAt === 'number' ? parsed.lastUpdatedAt : Date.now(),
    };
  } catch {
    return freshTournamentState();
  }
}

export async function saveTournament(state: TournamentState): Promise<void> {
  const snap: TournamentState = {
    ...state,
    version: CURRENT_VERSION,
    lastUpdatedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(TOURNAMENT_KEY, JSON.stringify(snap));
  } catch {
    // Best-effort — tournament stays live in memory.
  }
}

/**
 * Wipes all tournament data. NEXT `loadTournament()` returns a fresh state.
 */
export async function resetTournament(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TOURNAMENT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Replay mode: keeps unlockedCards + timesCompleted, resets currentRound to 0
 * and clears tournamentDeck.
 */
export async function replayTournament(): Promise<void> {
  try {
    const current = await loadTournament();
    const next: TournamentState = {
      version: CURRENT_VERSION,
      currentRound: 0,
      unlockedCards: current.unlockedCards,
      tournamentDeck: null,
      timesCompleted: current.timesCompleted,
      lastUpdatedAt: Date.now(),
    };
    await AsyncStorage.setItem(TOURNAMENT_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}
