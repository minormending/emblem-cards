/**
 * Shared helpers for battle-engine tests.
 *
 * Import these instead of copy-pasting factories into each test file:
 *
 *   import { makeUnit, buildDeck, value, errCode } from "./helpers";
 *
 * Keeping fixtures here means a stat tweak (e.g. default HP) only needs to
 * happen in one place.
 */
import type { Card, UnitCard, WeaponCard, Result } from "@cards/shared";
import { formatError } from "@cards/shared";

// ── Result accessors for assertion-friendly code ──

/** Assert a Result is an error and return its human-readable message. */
export function errMsg<T>(r: Result<T>): string {
  if (r.ok) throw new Error("Expected error, got success");
  return formatError(r.error);
}

/** Assert a Result is an error and return its stable error code. */
export function errCode<T>(r: Result<T>): string {
  if (r.ok) throw new Error("Expected error, got success");
  return r.error.code;
}

/** Assert a Result is a success and return its value. */
export function value<T>(r: Result<T>): T {
  if (!r.ok) throw new Error(`Expected success, got error: ${formatError(r.error)}`);
  return r.value;
}

// ── Card factories ──

/**
 * Build a test unit card. Defaults produce a "plain" sword infantry unit
 * with HP 20, STR 10, DEF 5; override any field to test specifics.
 */
export function makeUnit(id: string, overrides: Partial<UnitCard> = {}): UnitCard {
  return {
    type: "unit",
    id,
    name: `Unit ${id}`,
    class: "Mercenary",
    attackType: "sword",
    maxHp: 20,
    stats: { hp: 20, str: 10, mag: 0, def: 5, res: 3, spd: 8 },
    tags: ["infantry"],
    effects: [],
    cost: 2,
    isLord: false,
    ...overrides,
  };
}

/** Build a generic iron-sword weapon. */
export function makeWeapon(id: string): WeaponCard {
  return {
    type: "weapon",
    id,
    name: "Iron Sword",
    attackType: "sword",
    statBoost: { str: 2 },
    effects: [],
    cost: 1,
  };
}

/**
 * Build a 15-card deck of plain units. If `lordId` is provided, the unit
 * with that id is marked as the Lord; otherwise the first unit is the Lord.
 */
export function buildDeck(prefix: string, lordId?: string): Card[] {
  return Array.from({ length: 15 }, (_, i) => {
    const id = `${prefix}-${i}`;
    return makeUnit(id, { isLord: id === lordId });
  });
}
