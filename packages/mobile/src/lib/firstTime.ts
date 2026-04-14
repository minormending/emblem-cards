import { getItem, setItem, removeItem } from './storage';

const TUTORIAL_SEEN_KEY = 'emblem-cards.tutorialSeen';
const BATTLE_HINTS_DONE_KEY = 'emblem-cards.battleHintsDone';
const BATTLE_HINTS_DISMISSED_KEY = 'emblem-cards.battleHintsDismissed';

export const FIRST_TIME_KEYS = [
  TUTORIAL_SEEN_KEY,
  BATTLE_HINTS_DONE_KEY,
  BATTLE_HINTS_DISMISSED_KEY,
];

export function hasSeenTutorial(): boolean {
  return getItem(TUTORIAL_SEEN_KEY) === '1';
}
export function markTutorialSeen(): void {
  setItem(TUTORIAL_SEEN_KEY, '1');
}
export function hasDoneBattleHints(): boolean {
  return getItem(BATTLE_HINTS_DONE_KEY) === '1';
}
export function markBattleHintsDone(): void {
  setItem(BATTLE_HINTS_DONE_KEY, '1');
}
export function getDismissedHints(): Set<string> {
  try {
    const raw = getItem(BATTLE_HINTS_DISMISSED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}
export function addDismissedHint(id: string): void {
  const current = getDismissedHints();
  current.add(id);
  setItem(BATTLE_HINTS_DISMISSED_KEY, JSON.stringify([...current]));
}
export function resetTutorial(): void {
  removeItem(TUTORIAL_SEEN_KEY);
  removeItem(BATTLE_HINTS_DONE_KEY);
  removeItem(BATTLE_HINTS_DISMISSED_KEY);
}
