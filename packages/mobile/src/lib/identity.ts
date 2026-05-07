import { getItem, setItem, removeItem } from './storage';

const PLAYER_ID_KEY = 'emblem-cards.playerId';
const DISPLAY_NAME_KEY = 'emblem-cards.displayName';

export const IDENTITY_KEYS = [PLAYER_ID_KEY, DISPLAY_NAME_KEY];

function shortId(uuid: string): string {
  return uuid.replace(/-/g, '').slice(0, 4).toUpperCase();
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getPlayerId(): string {
  let id = getItem(PLAYER_ID_KEY);
  if (!id) {
    id = generateUUID();
    setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  const stored = getItem(DISPLAY_NAME_KEY);
  if (stored && stored.trim()) return stored.trim();
  return `Player-${shortId(getPlayerId())}`;
}

export function setDisplayName(name: string): void {
  const clean = name.trim().slice(0, 20);
  if (clean) setItem(DISPLAY_NAME_KEY, clean);
  else removeItem(DISPLAY_NAME_KEY);
}

export function clearIdentity(): void {
  removeItem(PLAYER_ID_KEY);
  removeItem(DISPLAY_NAME_KEY);
}
