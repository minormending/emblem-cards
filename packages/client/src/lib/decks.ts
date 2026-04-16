import type { Card } from "@cards/shared";

const DECKS_KEY = "emblem-cards.decks";
const CURRENT_VERSION = 1;

/**
 * Persist the player's current deck-builder state (both slots, so local 2P
 * mid-build is also preserved). Mirrors the mobile implementation at
 * packages/mobile/src/lib/decks.ts, but backed by localStorage instead of
 * AsyncStorage — sync where mobile is async.
 */
interface DecksSnapshot {
  version: 1;
  p1Deck: Card[];
  p2Deck: Card[];
}

export function saveDecks(p1Deck: Card[], p2Deck: Card[]): void {
  try {
    const snap: DecksSnapshot = { version: CURRENT_VERSION, p1Deck, p2Deck };
    localStorage.setItem(DECKS_KEY, JSON.stringify(snap));
  } catch {
    // Quota hit, Safari private mode, etc — decks stay live in memory only.
  }
}

export function loadDecks(): { p1Deck: Card[]; p2Deck: Card[] } | null {
  try {
    const raw = localStorage.getItem(DECKS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DecksSnapshot>;
    if (parsed.version !== CURRENT_VERSION) return null;
    if (!Array.isArray(parsed.p1Deck) || !Array.isArray(parsed.p2Deck)) return null;
    return { p1Deck: parsed.p1Deck, p2Deck: parsed.p2Deck };
  } catch {
    return null;
  }
}

export function clearDecks(): void {
  try {
    localStorage.removeItem(DECKS_KEY);
  } catch {
    // ignore
  }
}
