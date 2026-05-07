import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base` defaults to "/" in dev so local `pnpm dev` needs no config. In
// production it's set to "/emblem/" (or whatever prefix the gateway routes)
// via VITE_BASE_PATH so asset URLs in index.html line up with the deployed
// mount point.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const base = env.VITE_BASE_PATH || "/";
  return {
    base,
    plugins: [react(), tailwindcss()],
    resolve: {
      // `react-native-safe-area-context` in the root package.json hoists its
      // own React into the repo root node_modules. Without dedupe, zustand
      // (also hoisted) resolves that copy while the client resolves its own,
      // which breaks hooks. Dedupe forces a single React instance.
      dedupe: ["react", "react-dom"],
      // Prefer workspace package source over compiled dist so JSON/TS edits
      // in @cards/* packages are picked up by Vite's dep graph without a
      // rebuild. See the `exports.source` condition in those packages.
      conditions: ["source"],
    },
  };
});
