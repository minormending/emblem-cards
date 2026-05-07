/**
 * Tests for the tournament Zustand store (packages/client/src/store/tournamentStore.ts).
 *
 * Each case starts from a freshly-hydrated store on a cleared localStorage,
 * so tests don't leak state across each other.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { TournamentOpponent } from "@cards/shared";
import { useTournamentStore } from "../tournamentStore";

function makeOpponent(order: number, reward = `reward-${order}`): TournamentOpponent {
  return {
    id: `opp-${order}`,
    order,
    displayName: `Opponent ${order}`,
    archetype: "test",
    blurb: "",
    deck: [],
    ai: "medium",
    rewardCardId: reward,
  };
}

beforeEach(() => {
  localStorage.clear();
  useTournamentStore.getState().hydrate();
});

describe("tournamentStore", () => {
  it("hydrates to fresh values when storage is empty", () => {
    const s = useTournamentStore.getState();
    expect(s.currentRound).toBe(0);
    expect(s.unlockedCards).toEqual([]);
    expect(s.tournamentDeck).toBeNull();
    expect(s.timesCompleted).toBe(0);
  });

  it("isOpponentUnlocked / isOpponentDefeated track currentRound", () => {
    const s = useTournamentStore.getState();
    // At currentRound 0: only opponent 1 is unlocked, none defeated.
    expect(s.isOpponentUnlocked(1)).toBe(true);
    expect(s.isOpponentUnlocked(2)).toBe(false);
    expect(s.isOpponentDefeated(1)).toBe(false);
  });

  it("completeMatch(true) advances round, adds reward, and persists", () => {
    const opp1 = makeOpponent(1, "reward-1");
    useTournamentStore.getState().completeMatch(true, opp1);

    const s = useTournamentStore.getState();
    expect(s.currentRound).toBe(1);
    expect(s.unlockedCards).toEqual(["reward-1"]);
    expect(s.isOpponentUnlocked(2)).toBe(true);
    expect(s.isOpponentDefeated(1)).toBe(true);

    // Persistence: re-hydrating reads the same values back.
    useTournamentStore.getState().hydrate();
    expect(useTournamentStore.getState().currentRound).toBe(1);
    expect(useTournamentStore.getState().unlockedCards).toEqual(["reward-1"]);
  });

  it("completeMatch dedups the reward on repeat wins", () => {
    const opp = makeOpponent(3, "dup-reward");
    useTournamentStore.getState().completeMatch(true, opp);
    useTournamentStore.getState().completeMatch(true, opp);
    const s = useTournamentStore.getState();
    expect(s.unlockedCards).toEqual(["dup-reward"]);
    // currentRound doesn't regress and doesn't double-advance.
    expect(s.currentRound).toBe(3);
  });

  it("completeMatch(false) is a no-op", () => {
    const opp = makeOpponent(1);
    useTournamentStore.getState().completeMatch(false, opp);
    const s = useTournamentStore.getState();
    expect(s.currentRound).toBe(0);
    expect(s.unlockedCards).toEqual([]);
  });

  it("beating opponent #8 increments timesCompleted", () => {
    // Simulate progress up to opponent 7 via direct state.
    useTournamentStore.getState().completeMatch(true, makeOpponent(7, "r7"));
    expect(useTournamentStore.getState().timesCompleted).toBe(0);

    useTournamentStore.getState().completeMatch(true, makeOpponent(8, "r8"));
    const s = useTournamentStore.getState();
    expect(s.currentRound).toBe(8);
    expect(s.timesCompleted).toBe(1);
  });

  it("replay resets currentRound and deck but keeps unlocks + timesCompleted", () => {
    useTournamentStore.getState().completeMatch(true, makeOpponent(7, "r7"));
    useTournamentStore.getState().completeMatch(true, makeOpponent(8, "r8"));
    useTournamentStore
      .getState()
      .setTournamentDeck([{ id: "x" } as unknown as import("@cards/shared").Card]);

    useTournamentStore.getState().replay();
    const s = useTournamentStore.getState();
    expect(s.currentRound).toBe(0);
    expect(s.tournamentDeck).toBeNull();
    expect(s.unlockedCards).toEqual(["r7", "r8"]);
    expect(s.timesCompleted).toBe(1);
  });

  it("reset wipes everything back to fresh", () => {
    useTournamentStore.getState().completeMatch(true, makeOpponent(1, "r1"));
    useTournamentStore.getState().reset();
    const s = useTournamentStore.getState();
    expect(s.currentRound).toBe(0);
    expect(s.unlockedCards).toEqual([]);
    expect(s.timesCompleted).toBe(0);
    expect(s.tournamentDeck).toBeNull();
  });

  it("setTournamentDeck persists the deck", () => {
    const deck = [{ id: "card-1" } as unknown as import("@cards/shared").Card];
    useTournamentStore.getState().setTournamentDeck(deck);
    useTournamentStore.getState().hydrate();
    const loaded = useTournamentStore.getState().tournamentDeck;
    expect(loaded).not.toBeNull();
    expect(loaded?.length).toBe(1);
  });
});
