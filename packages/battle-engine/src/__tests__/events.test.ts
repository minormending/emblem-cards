/**
 * Verifies that engine actions emit the right GameEvents.
 *
 * Tests here are intentionally focused on the event stream rather than
 * state. State-focused tests live in the other *.test.ts files.
 */
import { describe, it, expect } from "vitest";
import type { GameEvent, TacticCard } from "@cards/shared";
import {
  attackAction,
  createGame,
  currentPlayer,
  deployCard,
  endTurn,
  opposingPlayer,
} from "../game.js";
import { placeUnit } from "../field.js";
import { buildDeck, makeUnit, value } from "./helpers.js";

function findEvent<K extends GameEvent["kind"]>(
  events: GameEvent[],
  kind: K
): Extract<GameEvent, { kind: K }> | undefined {
  return events.find((e) => e.kind === kind) as Extract<GameEvent, { kind: K }> | undefined;
}

describe("deployCard events", () => {
  it("emits unit_deployed when a unit is placed", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    player.hand[0] = makeUnit("m", { cost: 1 });
    player.energy = 5;

    const events = value(deployCard(state, 0, { row: "front", col: 0 }));
    const deployed = findEvent(events, "unit_deployed");
    expect(deployed).toBeDefined();
    expect(deployed!.position).toEqual({ row: "front", col: 0 });
    expect(deployed!.unit.id).toBe("m");
  });

  it("emits cards_drawn for a Thief's on-deploy effect", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    player.hand[0] = makeUnit("thief", {
      class: "Thief",
      effects: [{ kind: "draw_cards", amount: 1 }],
      cost: 1,
    });
    player.energy = 5;

    const events = value(deployCard(state, 0, { row: "front", col: 0 }));
    const drawn = findEvent(events, "cards_drawn");
    expect(drawn?.amount).toBe(1);
  });
});

describe("attackAction events", () => {
  it("emits unit_damaged with the correct amount", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    placeUnit(currentPlayer(state).field, { row: "front", col: 0 }, makeUnit("atk"), false);
    placeUnit(opposingPlayer(state).field, { row: "front", col: 0 }, makeUnit("def"));

    const events = value(attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 }));
    const damaged = findEvent(events, "unit_damaged");
    expect(damaged?.amount).toBe(5); // 10 STR - 5 DEF
    expect(damaged?.hpAfter).toBe(15); // 20 - 5
  });

  it("emits unit_ko AND game_won when the Lord dies", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    placeUnit(currentPlayer(state).field, { row: "front", col: 0 }, makeUnit("killer", {
      stats: { hp: 20, str: 30, mag: 0, def: 5, res: 3, spd: 8 },
    }), false);
    placeUnit(opposingPlayer(state).field, { row: "front", col: 0 }, makeUnit("lord", {
      isLord: true,
      stats: { hp: 5, str: 5, mag: 0, def: 0, res: 0, spd: 5 },
    }));

    const events = value(attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 }));
    expect(findEvent(events, "unit_ko")).toBeDefined();
    const won = findEvent(events, "game_won");
    expect(won?.reason).toBe("lord_ko");
  });
});

describe("endTurn events", () => {
  it("emits turn_ended and energy_changed", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const events = endTurn(state);
    expect(findEvent(events, "turn_ended")).toBeDefined();
    expect(findEvent(events, "energy_changed")?.to).toBe(2);
  });

  it("emits unit_healed when a Cleric's aura fires", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("cleric", {
      class: "Cleric",
      effects: [{ kind: "heal_adjacent", amount: 5 }],
    }));
    placeUnit(player.field, { row: "front", col: 1 }, makeUnit("ally", {
      stats: { hp: 10, str: 8, mag: 0, def: 4, res: 3, spd: 7 },
    }));
    const events = endTurn(state);
    const healed = findEvent(events, "unit_healed");
    expect(healed).toBeDefined();
    expect(healed!.amount).toBe(5);
  });
});

describe("item / tactic events", () => {
  it("emits item_played and cards_drawn for Convoy", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const convoy: TacticCard = {
      type: "tactic",
      id: "convoy",
      name: "Convoy",
      effects: [{ kind: "draw_cards", amount: 2 }],
      cost: 1,
    };
    player.hand[0] = convoy;
    player.energy = 5;

    const events = value(deployCard(state, 0));
    expect(findEvent(events, "item_played")?.card.id).toBe("convoy");
    expect(findEvent(events, "cards_drawn")?.amount).toBe(2);
  });
});
