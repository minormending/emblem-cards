/**
 * Zustand store for the Tournament mode.
 *
 * Separate from `gameStore` on purpose — tournament progression is an
 * independent concern from in-battle state, and isolating it keeps
 * per-battle re-renders from touching ladder/collection UI (and vice versa).
 *
 * Persistence is delegated to `../lib/tournament.ts` (localStorage, sync).
 * Every state-mutating action writes through to the lib, so a page reload
 * always restores what the player saw.
 *
 * Boot integration: call `useTournamentStore.getState().hydrate()` once from
 * `App.tsx` before the first tournament screen can be rendered.
 */
import { create } from "zustand";
import type { Card, TournamentOpponent, TournamentState } from "@cards/shared";
import {
  loadTournament,
  saveTournament,
  resetTournament,
  replayTournament,
} from "../lib/tournament";

interface TournamentStore {
  // ── State (mirrors TournamentState minus version/lastUpdatedAt) ──
  currentRound: number;
  unlockedCards: string[];
  tournamentDeck: Card[] | null;
  timesCompleted: number;

  // ── Derived helpers ──
  /** Opponent rows are clickable iff `order <= currentRound + 1` (and within ladder). */
  isOpponentUnlocked: (order: number) => boolean;
  /** An opponent is defeated iff their order has been surpassed by currentRound. */
  isOpponentDefeated: (order: number) => boolean;

  // ── Actions ──
  hydrate: () => void;
  completeMatch: (win: boolean, opponent: TournamentOpponent) => void;
  setTournamentDeck: (deck: Card[]) => void;
  replay: () => void;
  reset: () => void;
}

function toSnapshot(
  s: Pick<TournamentStore, "currentRound" | "unlockedCards" | "tournamentDeck" | "timesCompleted">,
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
  // Initial placeholder — real values populate in `hydrate()`.
  currentRound: 0,
  unlockedCards: [],
  tournamentDeck: null,
  timesCompleted: 0,

  isOpponentUnlocked: (order) => order <= get().currentRound + 1 && order <= 8,
  isOpponentDefeated: (order) => order <= get().currentRound,

  hydrate: () => {
    const persisted = loadTournament();
    set({
      currentRound: persisted.currentRound,
      unlockedCards: [...persisted.unlockedCards],
      tournamentDeck: persisted.tournamentDeck,
      timesCompleted: persisted.timesCompleted,
    });
  },

  completeMatch: (win, opponent) => {
    if (!win) return; // Loss is a no-op — no penalty, player retries.
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
    saveTournament(toSnapshot(next));
  },

  setTournamentDeck: (deck) => {
    set({ tournamentDeck: deck });
    const { currentRound, unlockedCards, timesCompleted } = get();
    saveTournament(
      toSnapshot({
        currentRound,
        unlockedCards,
        tournamentDeck: deck,
        timesCompleted,
      }),
    );
  },

  replay: () => {
    replayTournament();
    const persisted = loadTournament();
    set({
      currentRound: persisted.currentRound,
      unlockedCards: [...persisted.unlockedCards],
      tournamentDeck: persisted.tournamentDeck,
      timesCompleted: persisted.timesCompleted,
    });
  },

  reset: () => {
    resetTournament();
    const persisted = loadTournament();
    set({
      currentRound: persisted.currentRound,
      unlockedCards: [...persisted.unlockedCards],
      tournamentDeck: persisted.tournamentDeck,
      timesCompleted: persisted.timesCompleted,
    });
  },
}));
