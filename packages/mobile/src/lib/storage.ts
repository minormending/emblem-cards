import AsyncStorage from '@react-native-async-storage/async-storage';

const cache = new Map<string, string>();

/** Load a set of keys into the sync cache from AsyncStorage. Call at app boot. */
export async function hydrateStorage(keys: string[]): Promise<void> {
  const pairs = await AsyncStorage.multiGet(keys);
  for (const [k, v] of pairs) {
    if (v !== null) cache.set(k, v);
  }
}

export function getItem(key: string): string | null {
  return cache.has(key) ? cache.get(key)! : null;
}

export function setItem(key: string, value: string): void {
  cache.set(key, value);
  void AsyncStorage.setItem(key, value);
}

export function removeItem(key: string): void {
  cache.delete(key);
  void AsyncStorage.removeItem(key);
}
