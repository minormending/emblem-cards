import type { WeaponCard, SupportCard } from "./types.js";

export function formatWeaponBoosts(weapon: WeaponCard): string {
  return Object.entries(weapon.statBoost)
    .filter(([, v]) => v !== undefined && v !== 0)
    .map(([k, v]) => `+${v} ${k.toUpperCase()}`)
    .join(", ");
}

export function formatSupportPair(support: SupportCard): string {
  const { classA, classB } = support.pairRequirement;
  return classA === classB ? `2× ${classA}` : `${classA} or ${classB}`;
}

/** Semantic HP bucket — platforms map this to their own palette. */
export type HpTone = "good" | "warn" | "crit";

export function getHpTone(current: number, max: number): HpTone {
  const pct = max > 0 ? (current / max) * 100 : 0;
  if (pct > 60) return "good";
  if (pct > 30) return "warn";
  return "crit";
}

export function getHpPercent(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (current / max) * 100));
}
