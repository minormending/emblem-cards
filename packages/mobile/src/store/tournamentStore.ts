/**
 * Zustand store for Tournament mode — mobile mirror of
 * packages/client/src/store/tournamentStore.ts.
 *
 * Persistence is delegated to `../lib/tournament.ts` (AsyncStorage, async).
 * Boot integration: call `await useTournamentStore.getState().hydrate()`
 * from App.tsx before rendering any tournament screen.
 */
import { create } from 'zustand';
import type { Card, TournamentOpponent, TournamentState } from '@cards/shared';
import {
  loadTournament,
  saveTournament,
  resetTournament,
  replayTournament,
} from '../lib/tournament';

interface TournamentStore {
  currentRound: number;
  unlockedCards: string[];
  tournamentDeck: Card[] | null;
  timesCompleted: number;

  isOpponentUnlocked: (order: number) => boolean;
  isOpponentDefeated: (order: number) => boolean;

  hydrate: () => Promise<void>;
  completeMatch: (win: boolean, opponent: TournamentOpponent) => void;
  setTournamentDeck: (deck: Card[]) => void;
  replay: () => Promise<void>;
  reset: () => Promise<void>;
}

function toSnapshot(
  s: Pick<TournamentStore, 'currentRound' | 'unlockedCards' | 'tournamentDeck' | 'timesCompleted'>,
): TournamentState {
  return {
    version: 1,
    currentRound: s.currentRound,
    unlockedCards: s.unlockedCards,
    tournamentDeck: s.tournamentDeck,
    timesCompleted: s.timesCompleted,
    lastUpdatedAt: Date.now(),
  };
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  currentRound: 0,
  unlockedCards: [],
  tournamentDeck: null,
  timesCompleted: 0,

  isOpponentUnlocked: (order) => order <= get().currentRound + 1 && order <= 8,
  isOpponentDefeated: (order) => order <= get().currentRound,

  hydrate: async () => {
    const persisted = await loadTournament();
    set({
      currentRound: persisted.currentRound,
      unlockedCards: [...persisted.unlockedCards],
      tournamentDeck: persisted.tournamentDeck,
      timesCompleted: persisted.timesCompleted,
    });
  },

  completeMatch: (win, opponent) => {
    if (!win) return;
    const { currentRound, unlockedCards, timesCompleted, tournamentDeck } = get();

    const nextRound = Math.max(currentRound, opponent.order);
    const nextUnlocks = unlockedCards.includes(opponent.rewardCardId)
      ? unlockedCards
      : [...unlockedCards, opponent.rewardCardId];
    const nextTimesCompleted =
      opponent.order === 8 ? timesCompleted + 1 : timesCompleted;

    const next = {
      currentRound: nextRound,
      unlockedCards: nextUnlocks,
      tournamentDeck,
      timesCompleted: nextTimesCompleted,
    };
    set(next);
    // Fire-and-forget — mirrors saveDecks()'s best-effort write.
    void saveTournament(toSnapshot(next));
  },

  setTournamentDeck: (deck) => {
    set({ tournamentDeck: deck });
    const { currentRound, unlockedCards, timesCompleted } = get();
    void saveTournament(
      toSnapshot({
        currentRound,
        unlockedCards,
        tournamentDeck: deck,
        timesCompleted,
      }),
    );
  },

  replay: async () => {
    await replayTournament();
    const persisted = await loadTournament();
    set({
      currentRound: persisted.currentRound,
      unlockedCards: [...persisted.unlockedCards],
      tournamentDeck: persisted.tournamentDeck,
      timesCompleted: persisted.timesCompleted,
    });
  },

  reset: async () => {
    await resetTournament();
    const persisted = await loadTournament();
    set({
      currentRound: persisted.currentRound,
      unlockedCards: [...persisted.unlockedCards],
      tournamentDeck: persisted.tournamentDeck,
      timesCompleted: persisted.timesCompleted,
    });
  },
}));
