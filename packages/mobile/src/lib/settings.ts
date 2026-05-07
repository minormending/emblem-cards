import { getItem, setItem, removeItem } from './storage';

const HAPTICS_KEY = 'emblem-cards.hapticsEnabled';
const SERVER_URL_KEY = 'emblem-cards.serverUrl';

export const SETTINGS_KEYS = [HAPTICS_KEY, SERVER_URL_KEY];

export function getHapticsEnabled(): boolean {
  // Default on — absent value means never toggled, which means default-on.
  return getItem(HAPTICS_KEY) !== '0';
}

export function setHapticsEnabled(enabled: boolean): void {
  setItem(HAPTICS_KEY, enabled ? '1' : '0');
}

export function getServerUrlOverride(): string | null {
  return getItem(SERVER_URL_KEY);
}

export function setServerUrlOverride(url: string): void {
  const clean = url.trim();
  if (clean) setItem(SERVER_URL_KEY, clean);
  else removeItem(SERVER_URL_KEY);
}

export function clearServerUrlOverride(): void {
  removeItem(SERVER_URL_KEY);
}
