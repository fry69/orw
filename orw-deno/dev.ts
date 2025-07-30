#!/usr/bin/env -S deno run -A --watch=components/,islands/,lib,/routes/,server/,static/
// dev.ts - Fresh 2 development server

import { Builder } from "@fresh/core/dev";
import { tailwind } from "@fresh/plugin-tailwind";

// Set development mode flag and defaults
Deno.env.set("ORW_DEV_MODE", "true");

// Set development defaults if not already configured
if (!Deno.env.get("ORW_PUBLIC_URL")) {
  Deno.env.set("ORW_PUBLIC_URL", "http://localhost:8000");
}
if (!Deno.env.get("ORW_REPOSITORY_URL")) {
  Deno.env.set("ORW_REPOSITORY_URL", "https://github.com/fry69/orw");
}

const builder = new Builder();
tailwind(builder);

// Create optimized assets for the browser when running `deno run -A dev.ts build`
if (Deno.args.includes("build")) {
  await builder.build();
} else {
  // Start the development server
  // Note: In development, background watcher is disabled by default to avoid conflicts
  // Use CLI with --serve to enable both in development if needed
  await builder.listen(() => import("./main.ts"));
}
