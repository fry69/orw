import { App, staticFiles } from "fresh";
import type { State } from "./lib/app.ts";
import { initializeWatcher } from "./server/index.ts";

export const app = new App<State>();

app.use(staticFiles());

// Add health check route for monitoring/testing (before fsRoutes)
app.get("/health", () => new Response("OK", { status: 200 }));

// Include file-system based routes here
app.fsRoutes();

// Initialize immediately (not conditional on dev mode)
await initializeWatcher().catch((error) => {
  console.error("Failed to initialize ORW:", error);
  Deno.exit(1);
});
