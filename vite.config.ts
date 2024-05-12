import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { compression } from "vite-plugin-compression2";

export default defineConfig({
  build: {
    sourcemap: false, // Enable source maps
  },
  plugins: [react(), compression()],
});
