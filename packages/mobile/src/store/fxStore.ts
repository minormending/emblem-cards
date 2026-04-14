import { create } from 'zustand';
import type { AttackType, FieldPosition } from '@cards/shared';
export type { FieldPosition };

export type FxSide = 'own' | 'enemy';
export type FxKind = 'physical' | 'magical';

export interface CombatFx {
  id: number;
  side: FxSide;
  pos: FieldPosition;
  kind: FxKind;
  attackType: AttackType | null;
  amount: number;
  isCounter: boolean;
}

const FX_DURATION_MS = 650;
let nextId = 0;

interface FxStore {
  effects: CombatFx[];
  spawn: (fx: Omit<CombatFx, 'id'>) => void;
  clearAll: () => void;
}

export const useFxStore = create<FxStore>((set) => ({
  effects: [],
  spawn: (fx) => {
    const id = nextId++;
    set((s) => ({ effects: [...s.effects, { ...fx, id }] }));
    setTimeout(() => {
      set((s) => ({ effects: s.effects.filter((e) => e.id !== id) }));
    }, FX_DURATION_MS);
  },
  clearAll: () => set({ effects: [] }),
}));

const MAGICAL_TYPES: AttackType[] = ['fire', 'wind', 'thunder'];
export function isMagicalAttack(t: AttackType | null | undefined): boolean {
  return !!t && MAGICAL_TYPES.includes(t);
}
