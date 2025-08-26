import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwind from "@tailwindcss/vite";
import inspect from "vite-plugin-inspect";

export default defineConfig({
  plugins: [
    fresh(),
    tailwind(),
    inspect({
      build: true,
      outputDir: ".vite-inspect",
    }),
  ],
});
