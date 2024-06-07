/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { compression } from "vite-plugin-compression2";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), compression()],
  build: {
    outDir: "dist",
  },
  server: {
    port: 6500,
    proxy: {
      "/api": "http://localhost:3000",
      "/rss": "http://localhost:3000",
      "/orw.db.gz": "http://localhost:3000",
    },
  },
  test: {
    coverage: {
      exclude: [".attic/**", "backup/**", "docs/**"],
    },
    environment: "jsdom",
  },
});
