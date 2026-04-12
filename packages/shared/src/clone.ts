import type { Card, UnitCard, WeaponCard } from "./types.js";

/**
 * Deep clone a card so that mutations to its mutable fields (stats, tags, effects)
 * never leak back to the source (card template or another deck/hand/field slot).
 *
 * Critical for units: `stats` is mutated during battle (HP, buffs). Without this,
 * two deck slots holding the same card template reference would share HP.
 */
export function cloneCard<T extends Card>(card: T): T {
  if (card.type === "unit") {
    const u = card as UnitCard;
    return {
      ...u,
      stats: { ...u.stats },
      tags: [...u.tags],
      effects: [...u.effects],
    } as T;
  }
  if (card.type === "weapon") {
    const w = card as WeaponCard;
    return {
      ...w,
      statBoost: { ...w.statBoost },
      effects: [...w.effects],
    } as T;
  }
  // items / tactics / supports
  return {
    ...card,
    effects: [...card.effects],
  };
}
