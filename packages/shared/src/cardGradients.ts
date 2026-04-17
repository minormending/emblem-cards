import type { AttackType, Card } from "./types.js";

export const attackTypeGradients: Record<AttackType, readonly [string, string]> = {
  sword: ["#991b1b", "#450a0a"],
  axe: ["#166534", "#052e16"],
  lance: ["#1e40af", "#172554"],
  bow: ["#854d0e", "#422006"],
  fire: ["#c2410c", "#7c2d12"],
  wind: ["#047857", "#064e3b"],
  thunder: ["#6d28d9", "#3b0764"],
};

export const typeGradients: Record<string, readonly [string, string]> = {
  item: ["#065f46", "#022c22"],
  support: ["#0c4a6e", "#082f49"],
  tactic: ["#581c87", "#3b0764"],
};

const DEFAULT_GRADIENT: readonly [string, string] = ["#374151", "#111827"];

export function getCardGradient(card: Card): readonly [string, string] {
  if (card.type === "unit" || card.type === "weapon") {
    return attackTypeGradients[card.attackType];
  }
  return typeGradients[card.type] ?? DEFAULT_GRADIENT;
}
