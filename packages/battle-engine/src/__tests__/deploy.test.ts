import { describe, it, expect } from "vitest";
import type { TacticCard } from "@cards/shared";
import { currentPlayer, deployCard, createGame } from "../game.js";
import { getSlot } from "../field.js";
import { buildDeck, makeUnit, makeWeapon, errMsg } from "./helpers.js";

describe("Deploying a unit", () => {
  it("places the unit at the chosen field slot", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    player.hand[0] = makeUnit("deploy-test", { cost: 1 });
    player.energy = 3;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(true);

    const slot = getSlot(player.field, { row: "front", col: 0 });
    expect(slot.unit?.id).toBe("deploy-test");
  });

  it("fails when the player doesn't have enough energy", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    player.hand[0] = makeUnit("expensive", { cost: 5 });
    player.energy = 2;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("energy");
  });
});

describe("Deploying a weapon", () => {
  it("equips a weapon onto a unit", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    // First place a unit to equip to
    player.hand[0] = makeUnit("sword-wielder", { cost: 1 });
    player.energy = 5;
    deployCard(state, 0, { row: "front", col: 1 });

    // Now equip
    player.hand[0] = makeWeapon("iron-sword");
    const result = deployCard(state, 0, { row: "front", col: 1 });
    expect(result.ok).toBe(true);

    const slot = getSlot(player.field, { row: "front", col: 1 });
    expect(slot.weapon?.id).toBe("iron-sword");
  });
});

describe("On-deploy effects", () => {
  it("Thief's draw_cards effect fires when it hits the field", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    const thief = makeUnit("thief", {
      class: "Thief",
      effects: [{ kind: "draw_cards", amount: 1 }],
      cost: 1,
    });
    player.hand[0] = thief;
    player.energy = 5;
    const deckBefore = player.deck.length;
    const handBefore = player.hand.length;

    deployCard(state, 0, { row: "front", col: 0 });

    // -1 from deploy, +1 from draw → same hand size
    expect(player.hand.length).toBe(handBefore);
    expect(player.deck.length).toBe(deckBefore - 1);
  });
});

describe("Item / tactic target validation", () => {
  it("rejects heal_target on an empty slot without consuming the card", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    const heal: TacticCard = {
      type: "tactic",
      id: "heal",
      name: "Heal",
      effects: [{ kind: "heal_target", amount: 10 }],
      cost: 2,
    };
    player.hand[0] = heal;
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(player.energy).toBe(5);
    expect(player.hand[0]).toBe(heal);
  });

  it("rejects damage_target on an empty enemy slot", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    const bolting: TacticCard = {
      type: "tactic",
      id: "bolting",
      name: "Bolting",
      effects: [{ kind: "damage_target", amount: 8 }],
      cost: 4,
    };
    player.hand[0] = bolting;
    player.energy = 5;

    const result = deployCard(state, 0, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(player.energy).toBe(5);
  });
});
