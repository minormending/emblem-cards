/**
 * Loads card data from JSON, validates with zod at module load, then runs
 * the semantic `validateCardData` (HP consistency, duplicate IDs, etc.).
 *
 * Fail-fast: bad data throws at import time, so tests and server startup
 * surface the issue immediately.
 *
 * Non-engineers edit the JSON files under ./data/ and can run
 * `pnpm cards:check` to validate without booting the app.
 */
import type { Card, UnitCard, WeaponCard, AttackType } from "@cards/shared";
import unitsJson from "./data/units.json" with { type: "json" };
import weaponsJson from "./data/weapons.json" with { type: "json" };
import itemsJson from "./data/items.json" with { type: "json" };
import supportsJson from "./data/supports.json" with { type: "json" };
import tacticsJson from "./data/tactics.json" with { type: "json" };
import {
  UnitsFile,
  WeaponsFile,
  ItemsFile,
  SupportsFile,
  TacticsFile,
  formatZodIssues,
} from "./schema.js";
import { validateCardData } from "./validate.js";

function parseOrThrow<T>(
  file: string,
  data: unknown,
  schema: { safeParse: (d: unknown) => { success: true; data: T } | { success: false; error: import("zod").ZodError } },
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const lines = formatZodIssues(file, data, result.error);
    throw new Error(`Card data in ${file} is invalid:\n  ${lines.join("\n  ")}`);
  }
  return result.data;
}

export const units = parseOrThrow("units.json", unitsJson, UnitsFile);
export const weapons = parseOrThrow("weapons.json", weaponsJson, WeaponsFile);
export const items = parseOrThrow("items.json", itemsJson, ItemsFile);
export const supports = parseOrThrow("supports.json", supportsJson, SupportsFile);
export const tactics = parseOrThrow("tactics.json", tacticsJson, TacticsFile);

/** Every card in the game, all types combined. */
export const allCards: Card[] = [
  ...units,
  ...weapons,
  ...items,
  ...supports,
  ...tactics,
];

// Semantic invariants (HP==maxHp, duplicate ids, etc). Runs after schema
// parsing so shape is already guaranteed.
validateCardData(allCards);

/** Lookup any card by ID. */
const cardIndex = new Map<string, Card>(allCards.map((c) => [c.id, c]));

export function getCardById(id: string): Card | undefined {
  return cardIndex.get(id);
}

/** Get all units that match a given class name. */
export function getUnitsByClass(className: string): UnitCard[] {
  return units.filter((u) => u.class === className);
}

/** Get all units that use a given attack type. */
export function getUnitsByAttackType(attackType: AttackType): UnitCard[] {
  return units.filter((u) => u.attackType === attackType);
}

/** Get all weapons compatible with a given attack type. */
export function getWeaponsForType(attackType: AttackType): WeaponCard[] {
  return weapons.filter((w) => w.attackType === attackType);
}

/** Get all lord-eligible units. */
export function getLords(): UnitCard[] {
  return units.filter((u) => u.isLord);
}
