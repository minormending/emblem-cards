import { describe, it, expect } from "vitest";
import { calculateDamage } from "../damage.js";
import type { UnitCard, WeaponCard } from "@cards/shared";

function makeUnit(overrides: Partial<UnitCard> = {}): UnitCard {
  return {
    type: "unit",
    id: "test-unit",
    name: "Test Unit",
    class: "Mercenary",
    attackType: "sword",
    maxHp: 20,
    stats: { hp: 20, str: 10, mag: 0, def: 5, res: 3, spd: 8 },
    tags: ["infantry"],
    effects: [],
    cost: 3,
    isLord: false,
    ...overrides,
  };
}

function makeWeapon(overrides: Partial<WeaponCard> = {}): WeaponCard {
  return {
    type: "weapon",
    id: "test-weapon",
    name: "Iron Sword",
    attackType: "sword",
    statBoost: { str: 2 },
    effects: [],
    cost: 1,
    ...overrides,
  };
}

describe("calculateDamage", () => {
  it("basic physical damage: STR - DEF", () => {
    const attacker = makeUnit({ stats: { hp: 20, str: 12, mag: 0, def: 5, res: 3, spd: 8 } });
    const defender = makeUnit({ stats: { hp: 20, str: 8, mag: 0, def: 4, res: 3, spd: 6 } });

    const result = calculateDamage(attacker, null, defender, null);
    expect(result.damagePerHit).toBe(8); // 12 - 4
    expect(result.hits).toBe(1);
    expect(result.totalDamage).toBe(8);
  });

  it("minimum damage is 1 when DEF > STR", () => {
    const attacker = makeUnit({ stats: { hp: 20, str: 3, mag: 0, def: 5, res: 3, spd: 8 } });
    const defender = makeUnit({ stats: { hp: 20, str: 8, mag: 0, def: 10, res: 3, spd: 6 } });

    const result = calculateDamage(attacker, null, defender, null);
    expect(result.damagePerHit).toBe(1);
  });

  it("magical damage uses MAG vs RES", () => {
    const mage = makeUnit({
      attackType: "fire",
      stats: { hp: 15, str: 2, mag: 14, def: 3, res: 8, spd: 7 },
    });
    const defender = makeUnit({
      stats: { hp: 20, str: 8, mag: 0, def: 10, res: 4, spd: 6 },
    });

    const result = calculateDamage(mage, null, defender, null);
    expect(result.damagePerHit).toBe(10); // 14 - 4
  });

  it("weapon triangle bonus adds +2 ATK", () => {
    const swordUser = makeUnit({ attackType: "sword" });
    const axeUser = makeUnit({ attackType: "axe" });

    const result = calculateDamage(swordUser, null, axeUser, null);
    // STR(10) + triangle(2) - DEF(5) = 7
    expect(result.triangleBonus).toBe(2);
    expect(result.damagePerHit).toBe(7);
  });

  it("no triangle bonus when disadvantaged", () => {
    const swordUser = makeUnit({ attackType: "sword" });
    const lanceUser = makeUnit({ attackType: "lance" });

    const result = calculateDamage(swordUser, null, lanceUser, null);
    expect(result.triangleBonus).toBe(0);
    expect(result.damagePerHit).toBe(5); // 10 - 5
  });

  it("weapon stat boost adds to damage", () => {
    const attacker = makeUnit();
    const defender = makeUnit();
    const weapon = makeWeapon({ statBoost: { str: 3 } });

    const result = calculateDamage(attacker, weapon, defender, null);
    // STR(10) + weapon(3) - DEF(5) = 8
    expect(result.damagePerHit).toBe(8);
  });

  it("double attack effect hits twice", () => {
    const swordmaster = makeUnit({
      class: "Swordmaster",
      effects: [{ kind: "double_attack" }],
    });
    const defender = makeUnit();

    const result = calculateDamage(swordmaster, null, defender, null);
    expect(result.hits).toBe(2);
    expect(result.totalDamage).toBe(result.damagePerHit * 2);
  });

  it("damage multiplier vs flying (archer vs pegasus)", () => {
    const archer = makeUnit({
      attackType: "bow",
      effects: [{ kind: "damage_multiplier_vs_tag", tag: "flying", multiplier: 3 }],
    });
    const pegasus = makeUnit({
      class: "Pegasus Knight",
      tags: ["flying"],
      stats: { hp: 18, str: 8, mag: 0, def: 5, res: 7, spd: 10 },
    });

    const result = calculateDamage(archer, null, pegasus, null);
    // base: STR(10) - DEF(5) = 5, then x3 = 15
    expect(result.tagMultiplier).toBe(3);
    expect(result.damagePerHit).toBe(15);
  });

  it("weapon + triangle + multiplier all stack", () => {
    const attacker = makeUnit({
      attackType: "sword",
      effects: [{ kind: "damage_multiplier_vs_tag", tag: "mounted", multiplier: 2 }],
    });
    const defender = makeUnit({
      attackType: "axe",
      tags: ["mounted"],
      stats: { hp: 25, str: 12, mag: 0, def: 6, res: 3, spd: 5 },
    });
    const weapon = makeWeapon({ statBoost: { str: 2 } });

    const result = calculateDamage(attacker, weapon, defender, null);
    // STR(10) + weapon(2) + triangle(2) - DEF(6) = 8, then x2 = 16
    expect(result.damagePerHit).toBe(16);
  });
});
