import type { Card, UnitCard, WeaponCard, AttackType } from "@cards/shared";
import { units } from "./units.js";
import { weapons } from "./weapons.js";
import { items } from "./items.js";
import { supports } from "./supports.js";
import { tactics } from "./tactics.js";
import { validateCardData } from "./validate.js";

export { units, weapons, items, supports, tactics };

/** Every card in the game, all types combined. */
export const allCards: Card[] = [
  ...units,
  ...weapons,
  ...items,
  ...supports,
  ...tactics,
];

// Fail fast on bad card data. Running at module load means bad data
// crashes tests/server startup rather than misbehaving at runtime.
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
