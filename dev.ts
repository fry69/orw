#!/usr/bin/env -S deno run -A --watch=components/,islands/,lib,/routes/,server/,shared/,static/
// dev.ts - Fresh 2 development server

import { Builder } from "fresh/dev";
import { tailwind } from "@fresh/plugin-tailwind";

const builder = new Builder();
tailwind(builder);

// Create optimized assets for the browser when running `deno run -A dev.ts build`
if (Deno.args.includes("build")) {
  await builder.build();
} else {
  // Start the development server
  await builder.listen(() => import("./main.ts"));
}
