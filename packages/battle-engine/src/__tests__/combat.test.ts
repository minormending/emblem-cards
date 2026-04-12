import { describe, it, expect } from "vitest";
import type { WeaponCard, GameEvent } from "@cards/shared";
import {
  createGame,
  currentPlayer,
  opposingPlayer,
  attackAction,
  deployCard,
} from "../game.js";
import { getSlot, placeUnit, equipWeapon } from "../field.js";
import { buildDeck, makeUnit, errMsg, value } from "./helpers.js";

/** Find the first event of a given kind (useful for assertions). */
function findEvent<K extends GameEvent["kind"]>(
  events: GameEvent[],
  kind: K
): Extract<GameEvent, { kind: K }> | undefined {
  return events.find((e) => e.kind === kind) as Extract<GameEvent, { kind: K }> | undefined;
}

describe("Basic attack resolution", () => {
  it("deals STR - DEF damage", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("atk"), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("def"));

    const result = attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });
    const events = value(result);
    const damaged = findEvent(events, "unit_damaged");
    expect(damaged?.amount).toBe(5); // 10 STR - 5 DEF
    expect(damaged?.hpAfter).toBe(15);

    const defSlot = getSlot(opponent.field, { row: "front", col: 0 });
    expect(defSlot.unit!.stats.hp).toBe(15);
  });

  it("KOs the defender when damage reduces HP to 0 or below", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("strong", {
      stats: { hp: 20, str: 25, mag: 0, def: 5, res: 3, spd: 8 },
    }), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("weak", {
      stats: { hp: 5, str: 5, mag: 0, def: 3, res: 3, spd: 4 },
    }));

    const result = attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });
    const events = value(result);

    // Assert on events directly — no state diffing needed
    expect(findEvent(events, "unit_ko")).toBeDefined();

    // State check for completeness
    const defSlot = getSlot(opponent.field, { row: "front", col: 0 });
    expect(defSlot.unit).toBeNull();
    expect(opponent.discardPile.length).toBeGreaterThan(0);
  });
});

describe("Attack timing", () => {
  it("a unit cannot attack twice in the same turn", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("atk"), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("def"));

    expect(attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 }).ok).toBe(true);
    const second = attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });
    expect(second.ok).toBe(false);
    expect(errMsg(second)).toContain("already acted");
  });

  it("a unit deployed this turn cannot attack", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    player.hand[0] = makeUnit("fresh", { cost: 1 });
    player.energy = 5;
    deployCard(state, 0, { row: "front", col: 0 });
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("def"));

    const result = attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("already acted");
  });
});

describe("Targeting rules (reach)", () => {
  it("front melee cannot hit enemy back row", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("melee"), false);
    placeUnit(opponent.field, { row: "back", col: 0 }, makeUnit("hiding"));

    const result = attackAction(state, { row: "front", col: 0 }, { row: "back", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("Cannot reach");
  });

  it("back-row melee cannot attack at all", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "back", col: 0 }, makeUnit("stuck"), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("target"));

    const result = attackAction(state, { row: "back", col: 0 }, { row: "front", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("Cannot reach");
  });

  it("ranged-effect weapon (Javelin) lets a back-row unit attack", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "back", col: 0 }, makeUnit("knight", { attackType: "lance" }), false);

    const javelin: WeaponCard = {
      type: "weapon", id: "jav", name: "Javelin",
      attackType: "lance", statBoost: { str: 2 },
      effects: [{ kind: "ranged" }], cost: 2,
    };
    equipWeapon(player.field, { row: "back", col: 0 }, javelin);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("target"));

    const result = attackAction(state, { row: "back", col: 0 }, { row: "front", col: 0 });
    expect(result.ok).toBe(true);
  });

  it("ranged attacker can hit enemy front from back row", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "back", col: 0 }, makeUnit("archer", {
      attackType: "bow",
      effects: [{ kind: "ranged" }],
    }), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("target"));

    const result = attackAction(state, { row: "back", col: 0 }, { row: "front", col: 0 });
    expect(result.ok).toBe(true);
  });

  it("ranged attacker can hit enemy back when that column is unguarded", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("archer", {
      attackType: "bow",
      effects: [{ kind: "ranged" }],
    }), false);
    placeUnit(opponent.field, { row: "back", col: 0 }, makeUnit("exposed"));

    const result = attackAction(state, { row: "front", col: 0 }, { row: "back", col: 0 });
    expect(result.ok).toBe(true);
  });

  it("ranged attacker cannot hit enemy back when that column has a front guard", () => {
    const state = createGame(buildDeck("p1"), buildDeck("p2"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("archer", {
      attackType: "bow",
      effects: [{ kind: "ranged" }],
    }), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("guard"));
    placeUnit(opponent.field, { row: "back", col: 0 }, makeUnit("guarded"));

    const result = attackAction(state, { row: "front", col: 0 }, { row: "back", col: 0 });
    expect(result.ok).toBe(false);
    expect(errMsg(result)).toContain("Cannot reach");
  });
});

describe("Lord KO triggers immediate win", () => {
  it("attacking and KOing the enemy Lord sets state.winner", () => {
    const state = createGame(buildDeck("p1", "p1-0"), buildDeck("p2", "p2-0"), "p1", "p2");
    const player = currentPlayer(state);
    const opponent = opposingPlayer(state);

    placeUnit(player.field, { row: "front", col: 0 }, makeUnit("killer", {
      stats: { hp: 20, str: 30, mag: 0, def: 5, res: 3, spd: 8 },
    }), false);
    placeUnit(opponent.field, { row: "front", col: 0 }, makeUnit("p2-0", {
      isLord: true,
      stats: { hp: 5, str: 5, mag: 0, def: 0, res: 0, spd: 5 },
    }));

    attackAction(state, { row: "front", col: 0 }, { row: "front", col: 0 });
    expect(state.winner).toBe("p1");
  });
});
