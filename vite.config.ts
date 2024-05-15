import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { compression } from "vite-plugin-compression2";

export default defineConfig({
  build: {
    sourcemap: false, // Enable source maps
  },
  plugins: [react(), compression()],
  server: {
    port: 6500,
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  publicDir: "static",
});
