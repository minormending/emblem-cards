const STATS_KEY = "emblem-cards.stats";

type Mode = "ai" | "local" | "online";

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
  const raw = localStorage.getItem(STATS_KEY);
  if (!raw) return { ...DEFAULT_STATS };
  try {
    return { ...DEFAULT_STATS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_STATS };
  }
}

export function recordOutcome(mode: Mode, didWin: boolean, turnCount: number): Stats {
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
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  return stats;
}

export function clearStats(): void {
  localStorage.removeItem(STATS_KEY);
}

export function formatRecord(rec: ModeRecord): string {
  return `${rec.wins}W \u2013 ${rec.losses}L`;
}
