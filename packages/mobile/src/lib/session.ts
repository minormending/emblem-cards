import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Card, GameState } from '@cards/shared';

const SESSION_KEY = 'emblem-cards.session';

/**
 * Snapshot of an in-progress local/AI battle. Online sessions are server-owned
 * and aren't persisted — reconnection would need a real resume protocol.
 *
 * Versioned so we can evolve the shape without silently restoring a stale one.
 */
interface SessionSnapshot {
  version: 1;
  mode: 'local' | 'ai';
  gameState: GameState;
  p1Deck: Card[];
  p2Deck: Card[];
  savedAt: number;
}

const CURRENT_VERSION = 1;

export type { SessionSnapshot };

export async function saveSession(data: Omit<SessionSnapshot, 'version' | 'savedAt'>): Promise<void> {
  const snap: SessionSnapshot = {
    version: CURRENT_VERSION,
    ...data,
    savedAt: Date.now(),
  };
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(snap));
  } catch {
    // Quota exceeded or disk issue — drop silently, state is still live in memory.
  }
}

export async function loadSession(): Promise<SessionSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SessionSnapshot>;
    if (parsed.version !== CURRENT_VERSION) return null;
    if (!parsed.gameState || !parsed.p1Deck || !parsed.p2Deck) return null;
    if (parsed.gameState.winner) return null; // Finished game — no value restoring.
    return parsed as SessionSnapshot;
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore — best-effort cleanup
  }
}
