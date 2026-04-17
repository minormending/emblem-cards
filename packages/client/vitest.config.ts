import { defineConfig } from "vitest/config";

/**
 * Vitest config for the client package. We don't run a DOM env here — the
 * only code under test (tournament persistence + store) uses localStorage,
 * which the test setup polyfills as a plain in-memory Map. Keeps dev-deps
 * slim (no jsdom/happy-dom).
 */
export default defineConfig({
  resolve: {
    // Match the app's vite config so workspace packages resolve to their
    // TS source, not their compiled dist.
    conditions: ["source"],
  },
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts"],
  },
});
