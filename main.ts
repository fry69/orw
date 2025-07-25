// main.ts - Fresh 2 app entry point
import { App, staticFiles } from "fresh";
import { join } from "@std/path";
import type { State } from "./utils.ts";
import { OpenRouterAPIWatcher } from "./server/watcher.ts";
import { createDatabase } from "./server/database.ts";

const VERSION = "0.6.0";

// Initialize watcher once at startup
const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";
const dbPath = join(dataDir, "orw.db");

let globalWatcher: OpenRouterAPIWatcher | null = null;

export async function getGlobalWatcher(): Promise<OpenRouterAPIWatcher> {
  if (!globalWatcher) {
    const db = await createDatabase(dbPath);
    globalWatcher = new OpenRouterAPIWatcher({ db });
    console.log("Global watcher initialized");
  }
  return globalWatcher;
}

export const app = new App<State>();
app.use(staticFiles());
app.fsRoutes();

// For production deployment
export async function serve(options: {
  port?: number;
  hostname?: string;
  enableWatcher?: boolean;
} = {}) {
  const port = options.port || parseInt(Deno.env.get("ORW_PORT") || "8000");
  const hostname = options.hostname || Deno.env.get("ORW_HOSTNAME") || "localhost";
  // In development mode, disable watcher by default to avoid conflicts with hot-reloading
  const isDev = Deno.env.get("ORW_DEV_MODE") === "true";
  const defaultEnableWatcher = !isDev;
  const enableWatcher = options.enableWatcher ?? defaultEnableWatcher;

  // Initialize watcher
  const watcher = await getGlobalWatcher();

  console.log(`ORW v${VERSION} (Fresh 2) starting...`);
  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Mode: ${isDev ? "Development" : "Production"}`);

  // Start background watcher if enabled
  if (enableWatcher) {
    console.log("Starting background watcher...");
    // Don't await - let it run in the background
    watcher.enterBackgroundMode().catch((error) => {
      console.error("Background watcher error:", error);
    });
  } else {
    console.log("Background watcher disabled");
  }

  console.log(`Server starting on http://${hostname}:${port}`);
  await app.listen({ port, hostname });
}

// Allow main.ts to be run directly for backwards compatibility
if (import.meta.main) {
  await serve({ enableWatcher: true }); // Explicitly enable when run directly
}
