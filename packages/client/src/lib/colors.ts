import type { AttackType } from "@cards/shared";

export const attackTypeColors: Record<AttackType, string> = {
  sword: "bg-sword",
  axe: "bg-axe",
  lance: "bg-lance",
  bow: "bg-bow",
  fire: "bg-fire",
  wind: "bg-wind",
  thunder: "bg-thunder",
};

export const attackTypeBorders: Record<AttackType, string> = {
  sword: "border-sword",
  axe: "border-axe",
  lance: "border-lance",
  bow: "border-bow",
  fire: "border-fire",
  wind: "border-wind",
  thunder: "border-thunder",
};

export const attackTypeLabels: Record<AttackType, string> = {
  sword: "Sword",
  axe: "Axe",
  lance: "Lance",
  bow: "Bow",
  fire: "Fire",
  wind: "Wind",
  thunder: "Thunder",
};
