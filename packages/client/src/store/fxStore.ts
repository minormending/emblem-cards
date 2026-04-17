import { create } from "zustand";
import type { AttackType, FieldPosition, ItemCard, SupportCard, TacticCard, WeaponCard } from "@cards/shared";
export type { FieldPosition };

/**
 * Transient combat VFX spawned from unit_damaged events. Each effect is
 * anchored to a (side, position) slot and auto-expires after its animation
 * duration, at which point the store drops it.
 *
 * "side" distinguishes own vs opponent field, since both sides reuse the
 * same row/col tuple. Callers in local.ts decide which side the hit landed
 * on based on event.position and who is currentPlayer.
 */

export type FxSide = "own" | "enemy";
export type FxKind = "physical" | "magical";

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
const PLAYED_CARD_DURATION_MS = 2000;
// Spotlight runs slightly shorter than the card flash so the highlight fades
// just before the card does — feels like the effect "lands" at the end.
const SPOTLIGHT_DURATION_MS = 1800;

export interface SlotSpotlight {
  id: number;
  side: FxSide;
  pos: FieldPosition;
}

/**
 * Transient center-screen showcase of a non-unit card that was just played.
 * Supports has a shorter hold since the card also visibly lands in the active
 * supports row; items/tactics/weapons just flash and fade.
 */
export type PlayedCard =
  | { kind: "item"; card: ItemCard | TacticCard }
  | { kind: "weapon"; card: WeaponCard; ownerSide: "own" | "enemy" }
  | { kind: "support"; card: SupportCard; ownerSide: "own" | "enemy" };

export type PlayedCardFx = PlayedCard & { id: number };

let nextId = 0;

interface FxStore {
  effects: CombatFx[];
  playedCards: PlayedCardFx[];
  spotlights: SlotSpotlight[];
  spawn: (fx: Omit<CombatFx, "id">) => void;
  spawnPlayedCard: (fx: PlayedCard) => void;
  spawnSpotlight: (target: Omit<SlotSpotlight, "id">) => void;
  clearAll: () => void;
}

export const useFxStore = create<FxStore>((set) => ({
  effects: [],
  playedCards: [],
  spotlights: [],
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
  spawnSpotlight: (target) => {
    const id = nextId++;
    set((s) => ({ spotlights: [...s.spotlights, { ...target, id }] }));
    setTimeout(() => {
      set((s) => ({ spotlights: s.spotlights.filter((sp) => sp.id !== id) }));
    }, SPOTLIGHT_DURATION_MS);
  },
  clearAll: () => set({ effects: [], playedCards: [], spotlights: [] }),
}));

const MAGICAL_TYPES: AttackType[] = ["fire", "wind", "thunder"];
export function isMagicalAttack(t: AttackType | null | undefined): boolean {
  return !!t && MAGICAL_TYPES.includes(t);
}
