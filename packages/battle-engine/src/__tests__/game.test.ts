/**
 * Basic game lifecycle: createGame, drawPhase, endTurn.
 *
 * Other concerns have their own test files:
 *   - deploy.test.ts          — deploying each card type
 *   - combat.test.ts          — attackAction, targeting, KOs
 *   - effects.test.ts         — item/tactic/buff effect resolution
 *   - weapons.test.ts         — weapon compatibility rules
 *   - supports.test.ts        — support cards and pair activation
 *   - win.test.ts             — win-condition detection
 *   - mutation-safety.test.ts — card-template isolation tests
 */
import { describe, it, expect } from "vitest";
import { createGame, currentPlayer, drawPhase, endTurn } from "../game.js";
import { buildDeck, value } from "./helpers.js";

describe("Game creation", () => {
  it("creates a game with two players, hands drawn", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");

    expect(state.players).toHaveLength(2);
    expect(state.players[0].hand).toHaveLength(4);
    expect(state.players[1].hand).toHaveLength(4);
    expect(state.players[0].deck).toHaveLength(11); // 15 - 4
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.turnStep).toBe("draw");
  });

  it("players start with 1 energy", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    expect(currentPlayer(state).energy).toBe(1);
  });
});

describe("Draw phase", () => {
  it("draws a card and moves to deploy step", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const handBefore = currentPlayer(state).hand.length;

    const result = drawPhase(state);
    expect(value(result)).toBe(true);
    expect(currentPlayer(state).hand.length).toBe(handBefore + 1);
    expect(state.turnStep).toBe("deploy");
  });

  it("returns false when deck is empty", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    currentPlayer(state).deck = [];

    const result = drawPhase(state);
    expect(value(result)).toBe(false);
  });
});

describe("Turn flow", () => {
  it("endTurn swaps players and increments energy", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");

    expect(state.currentPlayerIndex).toBe(0);
    endTurn(state);

    expect(state.currentPlayerIndex).toBe(1);
    expect(currentPlayer(state).energy).toBe(2);
    expect(currentPlayer(state).maxEnergy).toBe(2);
  });

  it("energy caps at 8", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    state.players[1].maxEnergy = 8;

    endTurn(state);
    expect(currentPlayer(state).maxEnergy).toBe(8);
    expect(currentPlayer(state).energy).toBe(8);
  });
});
