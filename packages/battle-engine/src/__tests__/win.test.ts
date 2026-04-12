/**
 * checkWinCondition — the referee that decides when the game is over.
 *
 * Lord-KO mid-turn wins are tested in combat.test.ts (via attackAction).
 * This file covers the pure win-condition logic in isolation.
 */
import { describe, it, expect } from "vitest";
import { createGame } from "../game.js";
import { checkWinCondition } from "../win.js";
import { buildDeck, makeUnit } from "./helpers.js";

describe("checkWinCondition", () => {
  it("awards the game to the player whose opponent has a dead Lord", () => {
    const state = createGame(buildDeck("p1", "p1-0"), buildDeck("p2", "p2-0"), "p1", "p2");
    state.players[1].discardPile.push(makeUnit("p2-0", { isLord: true }));

    expect(checkWinCondition(state)).toBe("p1");
  });

  it("rout: opponent has no units on field, in hand, or in deck", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    state.players[1].hand = [];
    state.players[1].deck = [];

    expect(checkWinCondition(state)).toBe("p1");
  });

  it("no winner when opponent still has units somewhere", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    // Their field is empty but deck + hand are full from createGame
    expect(checkWinCondition(state)).toBeNull();
  });
});
