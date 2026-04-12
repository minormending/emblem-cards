/**
 * Support cards: deduplication rules.
 * (Pair-bonus damage calcs live in combat.test.ts.)
 */
import { describe, it, expect } from "vitest";
import { createGame, currentPlayer, deployCard } from "../game.js";
import { buildDeck } from "./helpers.js";

describe("Support dedup", () => {
  it("playing the same support twice does not stack — the duplicate is discarded", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    const support = {
      type: "support" as const,
      id: "test-support",
      name: "Test Support",
      pairRequirement: { classA: "Lord", classB: "Knight" },
      effects: [{ kind: "pair_bonus" as const, stat: "def" as const, amount: 3 }],
      cost: 1,
    };
    player.hand = [support, support];
    player.energy = 10;

    deployCard(state, 0);
    expect(player.activeSupportCards.length).toBe(1);

    deployCard(state, 0);
    expect(player.activeSupportCards.length).toBe(1);
    expect(player.discardPile.some((c) => c.id === "test-support")).toBe(true);
  });
});
