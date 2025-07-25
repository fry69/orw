// dev.ts - Fresh 2 development server
import { Builder } from "fresh/dev";

const builder = new Builder({
  target: "safari12",
});

// Create optimized assets for the browser when running `deno run -A dev.ts build`
if (Deno.args.includes("build")) {
  await builder.build();
} else {
  // Start the development server
  await builder.listen(() => import("./main.ts"));
}
