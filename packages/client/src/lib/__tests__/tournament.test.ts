/**
 * Tests for tournament persistence (packages/client/src/lib/tournament.ts).
 *
 * Uses an in-memory localStorage polyfill from src/test-setup.ts — no
 * jsdom needed since only `localStorage.{get,set,remove}Item` is touched.
 */
import { describe, it, expect, beforeEach } from "vitest";
import type { TournamentState } from "@cards/shared";
import { freshTournamentState } from "@cards/shared";
import {
  loadTournament,
  saveTournament,
  resetTournament,
  replayTournament,
} from "../tournament";

const KEY = "emblem-tournament/v1";

beforeEach(() => {
  localStorage.clear();
});

describe("tournament persistence", () => {
  it("loads a fresh state when storage is empty", () => {
    const loaded = loadTournament();
    expect(loaded.version).toBe(1);
    expect(loaded.currentRound).toBe(0);
    expect(loaded.unlockedCards).toEqual([]);
    expect(loaded.tournamentDeck).toBeNull();
    expect(loaded.timesCompleted).toBe(0);
  });

  it("round-trips: save then load returns equal state", () => {
    const state: TournamentState = {
      ...freshTournamentState(),
      currentRound: 3,
      unlockedCards: ["card-a", "card-b", "card-c"],
      timesCompleted: 1,
    };
    saveTournament(state);
    const loaded = loadTournament();
    expect(loaded.currentRound).toBe(3);
    expect(loaded.unlockedCards).toEqual(["card-a", "card-b", "card-c"]);
    expect(loaded.timesCompleted).toBe(1);
    expect(loaded.tournamentDeck).toBeNull();
  });

  it("returns a fresh state on version mismatch", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        version: 999,
        currentRound: 5,
        unlockedCards: ["x"],
        tournamentDeck: null,
        timesCompleted: 0,
        lastUpdatedAt: 0,
      }),
    );
    const loaded = loadTournament();
    expect(loaded.version).toBe(1);
    expect(loaded.currentRound).toBe(0);
    expect(loaded.unlockedCards).toEqual([]);
  });

  it("returns a fresh state on corrupt JSON", () => {
    localStorage.setItem(KEY, "{not valid json");
    const loaded = loadTournament();
    expect(loaded.currentRound).toBe(0);
    expect(loaded.unlockedCards).toEqual([]);
  });

  it("returns a fresh state when shape is wrong (missing fields)", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 1, currentRound: "oops" }));
    const loaded = loadTournament();
    expect(loaded.currentRound).toBe(0);
  });

  it("resetTournament wipes everything — next load is fresh", () => {
    saveTournament({
      ...freshTournamentState(),
      currentRound: 4,
      unlockedCards: ["a", "b"],
      timesCompleted: 2,
    });
    resetTournament();
    const loaded = loadTournament();
    expect(loaded.currentRound).toBe(0);
    expect(loaded.unlockedCards).toEqual([]);
    expect(loaded.timesCompleted).toBe(0);
  });

  it("replayTournament preserves unlocks and timesCompleted but resets progress", () => {
    saveTournament({
      ...freshTournamentState(),
      currentRound: 8,
      unlockedCards: ["a", "b", "c"],
      timesCompleted: 2,
      // Cast: we're storing a structurally-valid stand-in for Card[] to
      // verify it gets cleared, without requiring the full Card shape.
      tournamentDeck: [{ id: "fake" } as unknown as import("@cards/shared").Card],
    });
    replayTournament();
    const loaded = loadTournament();
    expect(loaded.currentRound).toBe(0);
    expect(loaded.tournamentDeck).toBeNull();
    expect(loaded.unlockedCards).toEqual(["a", "b", "c"]);
    expect(loaded.timesCompleted).toBe(2);
  });
});
