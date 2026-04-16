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
      dedupe: ["react", "react-dom"],
    },
  };
});
