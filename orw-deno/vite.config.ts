import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwind from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    fresh(),
    tailwind(),
  ],
});
