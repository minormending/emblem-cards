import { getItem, setItem, removeItem } from './storage';

// Single JSON blob keeps the storage key count low and lets us extend the shape
// (e.g. per-class records) without a migration.
const STATS_KEY = 'emblem-cards.stats';

export const STATS_KEYS = [STATS_KEY];

type Mode = 'ai' | 'local' | 'online';

export interface ModeRecord {
  wins: number;
  losses: number;
}

export interface Stats {
  ai: ModeRecord;
  local: ModeRecord;
  online: ModeRecord;
  totalTurnsPlayed: number;
  fastestWinTurns: number | null;
}

const DEFAULT_STATS: Stats = {
  ai: { wins: 0, losses: 0 },
  local: { wins: 0, losses: 0 },
  online: { wins: 0, losses: 0 },
  totalTurnsPlayed: 0,
  fastestWinTurns: null,
};

export function getStats(): Stats {
  const raw = getItem(STATS_KEY);
  if (!raw) return { ...DEFAULT_STATS };
  try {
    const parsed = JSON.parse(raw);
    // Defensive merge so an older on-disk shape can't crash the app.
    return { ...DEFAULT_STATS, ...parsed };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

function writeStats(stats: Stats): void {
  setItem(STATS_KEY, JSON.stringify(stats));
}

export function recordOutcome(
  mode: Mode,
  didWin: boolean,
  turnCount: number,
): Stats {
  const stats = getStats();
  const rec = stats[mode];
  if (didWin) {
    rec.wins += 1;
    if (stats.fastestWinTurns === null || turnCount < stats.fastestWinTurns) {
      stats.fastestWinTurns = turnCount;
    }
  } else {
    rec.losses += 1;
  }
  stats.totalTurnsPlayed += turnCount;
  writeStats(stats);
  return stats;
}

export function clearStats(): void {
  removeItem(STATS_KEY);
}

/** "4W – 2L" style string for a single mode. */
export function formatRecord(rec: ModeRecord): string {
  return `${rec.wins}W – ${rec.losses}L`;
}
