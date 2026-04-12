/**
 * Effect resolution: healing, buffs, HP caps.
 * Item/tactic targeting validation lives in deploy.test.ts.
 */
import { describe, it, expect } from "vitest";
import type { TacticCard } from "@cards/shared";
import { createGame, currentPlayer, deployCard } from "../game.js";
import { getSlot, placeUnit } from "../field.js";
import { buildDeck, makeUnit } from "./helpers.js";

describe("Healing caps at maxHp", () => {
  it("heal_target cannot exceed the unit's maxHp", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("hurt", {
      maxHp: 20,
      stats: { hp: 5, str: 10, mag: 0, def: 5, res: 3, spd: 8 },
    }));

    const mega: TacticCard = {
      type: "tactic",
      id: "mega-heal",
      name: "Mega Heal",
      effects: [{ kind: "heal_target", amount: 100 }],
      cost: 1,
    };
    player.hand[0] = mega;
    player.energy = 5;
    deployCard(state, 0, { row: "front", col: 0 });

    const slot = getSlot(player.field, { row: "front", col: 0 });
    expect(slot.unit!.stats.hp).toBe(20);
  });
});

describe("HP buffs don't inflate maxHp", () => {
  it("stacking buff_target on hp caps at the original maxHp", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("u", {
      maxHp: 20,
      stats: { hp: 15, str: 10, mag: 0, def: 5, res: 3, spd: 8 },
    }));

    const hpBuff: TacticCard = {
      type: "tactic",
      id: "hp-buff",
      name: "Big Buff",
      effects: [{ kind: "buff_target", stat: "hp", amount: 50, duration: 99 }],
      cost: 0,
    };
    player.hand = [hpBuff, hpBuff, hpBuff];
    player.energy = 10;

    // Three +50 HP buffs should not raise hp past 20
    deployCard(state, 0, { row: "front", col: 0 });
    deployCard(state, 0, { row: "front", col: 0 });
    deployCard(state, 0, { row: "front", col: 0 });

    const unit = player.field.front[0].unit!;
    expect(unit.stats.hp).toBe(20);
    expect(unit.maxHp).toBe(20); // no creep
  });
});
