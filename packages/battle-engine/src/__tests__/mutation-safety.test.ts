/**
 * Card-template isolation tests.
 *
 * These tests guard against a class of bugs where multiple deck/hand/field
 * slots pointing at the same card template share mutable state (HP, stats).
 * `placeUnit` deep-clones the unit when moving it to the field; this file
 * verifies that invariant across several scenarios.
 */
import { describe, it, expect } from "vitest";
import type { Card } from "@cards/shared";
import { createGame, currentPlayer, opposingPlayer, attackAction, deployCard } from "../game.js";
import { placeUnit } from "../field.js";
import { buildDeck, makeUnit } from "./helpers.js";

describe("Mutation safety", () => {
  it("damaging a deployed unit does not mutate its source template", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    const template = makeUnit("shared", {
      stats: { hp: 20, str: 10, mag: 0, def: 5, res: 3, spd: 8 },
    });
    placeUnit(player.field, { row: "front", col: 0 }, template, false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("foe"));

    attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });
    expect(template.stats.hp).toBe(20);
  });

  it("two deployed copies of the same card have independent HP", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    const marth = makeUnit("marth", {
      stats: { hp: 25, str: 10, mag: 0, def: 5, res: 3, spd: 8 },
    });
    // Simulate a deck with two references to the same card
    player.hand[0] = marth;
    player.hand[1] = marth;
    player.energy = 10;

    deployCard(state, 0, { row: "front", col: 0 });
    deployCard(state, 0, { row: "front", col: 1 }); // index 0 after splice
    player.field.front[0].hasActed = false;
    player.field.front[1].hasActed = false;

    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("foe"));

    attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });

    const copyA = player.field.front[0].unit!;
    const copyB = player.field.front[1].unit!;
    expect(copyA).not.toBe(copyB);
    expect(copyA.stats).not.toBe(copyB.stats);
    expect(copyB.stats.hp).toBe(25);
  });

  it("using real card data: two copies of Hawkeye on the field remain independent", async () => {
    const { units } = await import("@cards/card-engine");
    const hawkeye = units.find((u) => u.id === "berserker-hawkeye")!;
    const marth = units.find((u) => u.id === "lord-marth")!;

    const p1Deck: Card[] = [marth, hawkeye, hawkeye];
    while (p1Deck.length < 15) p1Deck.push(hawkeye);
    const p2Deck: Card[] = [marth];
    while (p2Deck.length < 15) p2Deck.push(hawkeye);

    const state = createGame(p1Deck, p2Deck, "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    player.hand = [hawkeye, hawkeye];
    player.energy = 10;
    deployCard(state, 0, { row: "front", col: 0 });
    deployCard(state, 0, { row: "front", col: 1 });
    player.field.front[0].hasActed = false;
    player.field.front[1].hasActed = false;

    const copyA = player.field.front[0].unit!;
    const copyB = player.field.front[1].unit!;
    expect(copyA).not.toBe(copyB);
    expect(copyA.stats).not.toBe(copyB.stats);

    // Attack copy A; copy B must be unaffected
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("foe", {
      stats: { hp: 20, str: 20, mag: 0, def: 5, res: 3, spd: 8 },
    }), false);
    state.currentPlayerIndex = 1;
    attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });

    expect(copyA.stats.hp).toBeLessThan(hawkeye.stats.hp);
    expect(copyB.stats.hp).toBe(hawkeye.stats.hp);
    // Source template still pristine
    expect(hawkeye.stats.hp).toBe(28);
  });

  it("damaging one copy doesn't damage its sibling on the field", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    const marth = makeUnit("marth", {
      stats: { hp: 25, str: 5, mag: 0, def: 0, res: 0, spd: 5 },
    });
    placeUnit(opponent.field, { row: "front", col: 0 }, marth);
    placeUnit(opponent.field, { row: "front", col: 1 }, marth);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("atk", {
      stats: { hp: 20, str: 20, mag: 0, def: 5, res: 3, spd: 8 },
    }), false);

    attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });

    const copyA = opponent.field.front[0].unit;
    const copyB = opponent.field.front[1].unit;
    expect(copyA?.stats.hp).toBe(5);
    expect(copyB?.stats.hp).toBe(25);
  });
});
