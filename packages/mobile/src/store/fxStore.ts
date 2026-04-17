import { create } from 'zustand';
import type {
  AttackType,
  FieldPosition,
  ItemCard,
  SupportCard,
  TacticCard,
  WeaponCard,
} from '@cards/shared';
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
const PLAYED_CARD_DURATION_MS = 1100;
let nextId = 0;

export type PlayedCard =
  | { kind: 'item'; card: ItemCard | TacticCard }
  | { kind: 'weapon'; card: WeaponCard; ownerSide: 'own' | 'enemy' }
  | { kind: 'support'; card: SupportCard; ownerSide: 'own' | 'enemy' };

export type PlayedCardFx = PlayedCard & { id: number };

interface FxStore {
  effects: CombatFx[];
  playedCards: PlayedCardFx[];
  spawn: (fx: Omit<CombatFx, 'id'>) => void;
  spawnPlayedCard: (fx: PlayedCard) => void;
  clearAll: () => void;
}

export const useFxStore = create<FxStore>((set) => ({
  effects: [],
  playedCards: [],
  spawn: (fx) => {
    const id = nextId++;
    set((s) => ({ effects: [...s.effects, { ...fx, id }] }));
    setTimeout(() => {
      set((s) => ({ effects: s.effects.filter((e) => e.id !== id) }));
    }, FX_DURATION_MS);
  },
  spawnPlayedCard: (fx) => {
    const id = nextId++;
    set((s) => ({ playedCards: [...s.playedCards, { ...fx, id }] }));
    setTimeout(() => {
      set((s) => ({ playedCards: s.playedCards.filter((c) => c.id !== id) }));
    }, PLAYED_CARD_DURATION_MS);
  },
  clearAll: () => set({ effects: [], playedCards: [] }),
}));

const MAGICAL_TYPES: AttackType[] = ['fire', 'wind', 'thunder'];
export function isMagicalAttack(t: AttackType | null | undefined): boolean {
  return !!t && MAGICAL_TYPES.includes(t);
}
