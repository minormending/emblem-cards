// Anonymous persistent identity.
//
// No passwords, no usernames. Each browser gets a UUID on first visit stored
// in localStorage. Players may set an optional display name (also local only)
// which is used as a label during matches.
//
// If the user clears their browser data, they become a new player. This is
// intentional — we trade account recovery for zero PII storage.

const PLAYER_ID_KEY = "emblem-cards.playerId";
const DISPLAY_NAME_KEY = "emblem-cards.displayName";

/** Short, human-friendly suffix derived from a UUID for default display names. */
function shortId(uuid: string): string {
  return uuid.replace(/-/g, "").slice(0, 4).toUpperCase();
}

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getPlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  const stored = localStorage.getItem(DISPLAY_NAME_KEY);
  if (stored && stored.trim()) return stored.trim();
  // Default: "Player-ABCD" using short suffix of UUID
  return `Player-${shortId(getPlayerId())}`;
}

export function setDisplayName(name: string): void {
  const clean = name.trim().slice(0, 20);
  if (clean) {
    localStorage.setItem(DISPLAY_NAME_KEY, clean);
  } else {
    localStorage.removeItem(DISPLAY_NAME_KEY);
  }
}

export function hasCustomDisplayName(): boolean {
  return localStorage.getItem(DISPLAY_NAME_KEY) !== null;
}

/** Wipe local identity. Next call to getPlayerId() will generate a new one. */
export function clearIdentity(): void {
  localStorage.removeItem(PLAYER_ID_KEY);
  localStorage.removeItem(DISPLAY_NAME_KEY);
}
