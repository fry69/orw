import { App, staticFiles } from "fresh";
import type { State } from "./utils.ts";
import { initializeWatcher } from "@orw/server";

export const app: App<State> = new App<State>();

app.use(staticFiles());

// Include file-system based routes here
app.fsRoutes();

// Initialize immediately (not conditional on dev mode)
await initializeWatcher().catch((error) => {
  console.error("Failed to initialize ORW:", error);
  Deno.exit(1);
});
