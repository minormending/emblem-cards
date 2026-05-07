/**
 * Global test setup: minimal in-memory localStorage polyfill so we don't
 * have to pull in jsdom/happy-dom just to exercise persistence libs.
 */
class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

// Fresh MemoryStorage on each test run (the test file's `beforeEach` can
// `localStorage.clear()` to reset between cases).
(globalThis as unknown as { localStorage: Storage }).localStorage =
  new MemoryStorage() as unknown as Storage;
