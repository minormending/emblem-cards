import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card } from '@cards/shared';

const DECKS_KEY = 'emblem-cards.decks';

/**
 * Persist the player's current deck-builder state (both slots, so local 2P
 * mid-build is also preserved). Versioned for future evolution.
 */
interface DecksSnapshot {
  version: 1;
  p1Deck: Card[];
  p2Deck: Card[];
}

const CURRENT_VERSION = 1;

export async function saveDecks(p1Deck: Card[], p2Deck: Card[]): Promise<void> {
  const snap: DecksSnapshot = { version: CURRENT_VERSION, p1Deck, p2Deck };
  try {
    await AsyncStorage.setItem(DECKS_KEY, JSON.stringify(snap));
  } catch {
    // Best-effort — decks stay live in memory.
  }
}

export async function loadDecks(): Promise<{
  p1Deck: Card[];
  p2Deck: Card[];
} | null> {
  try {
    const raw = await AsyncStorage.getItem(DECKS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DecksSnapshot>;
    if (parsed.version !== CURRENT_VERSION) return null;
    if (!Array.isArray(parsed.p1Deck) || !Array.isArray(parsed.p2Deck)) {
      return null;
    }
    return { p1Deck: parsed.p1Deck, p2Deck: parsed.p2Deck };
  } catch {
    return null;
  }
}

export async function clearDecks(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DECKS_KEY);
  } catch {
    // ignore
  }
}
