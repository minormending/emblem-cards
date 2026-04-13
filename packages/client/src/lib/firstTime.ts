// Flags tracking whether the player has seen specific tutorial content.
// Stored in localStorage, so new browsers / cleared data = fresh tutorial.

const TUTORIAL_SEEN_KEY = "emblem-cards.tutorialSeen";
const BATTLE_HINTS_DONE_KEY = "emblem-cards.battleHintsDone";
const BATTLE_HINTS_DISMISSED_KEY = "emblem-cards.battleHintsDismissed";

export function hasSeenTutorial(): boolean {
  return localStorage.getItem(TUTORIAL_SEEN_KEY) === "1";
}

export function markTutorialSeen(): void {
  localStorage.setItem(TUTORIAL_SEEN_KEY, "1");
}

export function hasDoneBattleHints(): boolean {
  return localStorage.getItem(BATTLE_HINTS_DONE_KEY) === "1";
}

export function markBattleHintsDone(): void {
  localStorage.setItem(BATTLE_HINTS_DONE_KEY, "1");
}

/** Individual hint ids the player has already dismissed. Persists across games. */
export function getDismissedHints(): Set<string> {
  try {
    const raw = localStorage.getItem(BATTLE_HINTS_DISMISSED_KEY);
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
  localStorage.setItem(BATTLE_HINTS_DISMISSED_KEY, JSON.stringify([...current]));
}

/** Reset all tutorial flags. Useful if the user wants to see the intro again. */
export function resetTutorial(): void {
  localStorage.removeItem(TUTORIAL_SEEN_KEY);
  localStorage.removeItem(BATTLE_HINTS_DONE_KEY);
  localStorage.removeItem(BATTLE_HINTS_DISMISSED_KEY);
}
