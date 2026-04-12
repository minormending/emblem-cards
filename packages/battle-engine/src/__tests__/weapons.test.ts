/**
 * Weapon compatibility rules and re-equip discard behavior.
 *
 * Combat effects of weapons (damage, ranged) live in combat.test.ts.
 */
import { describe, it, expect } from "vitest";
import type { WeaponCard } from "@cards/shared";
import { ErrorCode } from "@cards/shared";
import { createGame, currentPlayer, deployCard } from "../game.js";
import { placeUnit } from "../field.js";
import { buildDeck, makeUnit, errMsg, errCode } from "./helpers.js";

// Factory helpers for weapons with one knob each
function sword(id = "sword"): WeaponCard {
  return { type: "weapon", id, name: "Sword", attackType: "sword", statBoost: { str: 2 }, effects: [], cost: 1 };
}
function axe(): WeaponCard {
  return { type: "weapon", id: "axe", name: "Axe", attackType: "axe", statBoost: { str: 5 }, effects: [], cost: 1 };
}
function fireTome(): WeaponCard {
  return { type: "weapon", id: "fire", name: "Fire", attackType: "fire", statBoost: { mag: 3 }, effects: [], cost: 1 };
}
function windTome(): WeaponCard {
  return { type: "weapon", id: "wind", name: "Wind", attackType: "wind", statBoost: { mag: 3 }, effects: [], cost: 1 };
}

describe("Weapon compatibility", () => {
  it("rejects weapons of a different physical type", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("swordie", { attackType: "sword" }));
    player.hand[0] = axe();
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("match");
  });

  it("rejects magic tomes on physical units", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("swordie", { attackType: "sword" }));
    player.hand[0] = fireTome();
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(errCode(result)).toBe(ErrorCode.TOME_ON_WARRIOR);
  });

  it("rejects physical weapons on mage units", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("fireM", { attackType: "fire" }));
    player.hand[0] = sword();
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("Physical weapons cannot be equipped by mages");
  });

  it("allows cross-element magic tomes (fire mage with wind tome)", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("fireM", { attackType: "fire" }));
    player.hand[0] = windTome();
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(true);
  });

  it("allows matching attack types", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("swordie", { attackType: "sword" }));
    player.hand[0] = sword();
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(true);
  });
});

describe("Weapon re-equip", () => {
  it("equipping a new weapon sends the old one to the discard pile", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("s", { attackType: "sword" }));

    const iron: WeaponCard = {
      type: "weapon", id: "iron", name: "Iron",
      attackType: "sword", statBoost: { str: 2 }, effects: [], cost: 1,
    };
    const brave: WeaponCard = {
      type: "weapon", id: "brave", name: "Brave",
      attackType: "sword", statBoost: { str: 3 }, effects: [], cost: 2,
    };
    player.hand = [iron, brave];
    player.energy = 10;

    deployCard(state, 0, { row: "front", col: 0 });
    expect(player.field.front[0].weapon?.id).toBe("iron");
    expect(player.discardPile.length).toBe(0);

    deployCard(state, 0, { row: "front", col: 0 });
    expect(player.field.front[0].weapon?.id).toBe("brave");
    expect(player.discardPile.some((c) => c.id === "iron")).toBe(true);
  });
});
