import type { AttackType } from '@cards/shared';

// Hex values for RN styling. Approximate the Tailwind palette used on web.
export const attackTypeHex: Record<AttackType, string> = {
  sword: '#60a5fa',
  axe: '#f87171',
  lance: '#4ade80',
  bow: '#fbbf24',
  fire: '#f97316',
  wind: '#22d3ee',
  thunder: '#a855f7',
};

export const cardTypeColor: Record<string, string> = {
  unit: '#4b5563',
  weapon: '#6b7280',
  support: '#0ea5e9',
  item: '#10b981',
  tactic: '#a855f7',
};
