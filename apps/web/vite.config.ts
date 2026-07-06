import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

const repoRoot = fileURLToPath(new URL("../..", import.meta.url));
const apiProxyTarget =
  process.env.SERVER_INTERNAL_URL ??
  process.env.VITE_SERVER_URL ??
  "http://127.0.0.1:3002";

export default defineConfig({
  envDir: repoRoot,
  server: {
    port: 3001,
    host: true,
    proxy: {
      "/api": {
        target: apiProxyTarget,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});
