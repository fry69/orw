import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwind from "@tailwindcss/vite";
import domain from "@fry69/vite-plugin-localcaddy";

export default defineConfig({
  plugins: [
    fresh(),
    tailwind(),
    domain(),
  ],
});
