// main.ts - Fresh 2 app entry point
import { App } from "fresh";
import { OpenRouterAPIWatcher } from "./server/watcher.ts";
import { createProductionWatcher } from "./server/watcher-factory.ts";
import { VERSION } from "./lib/constants.ts";

type State = { watcher?: OpenRouterAPIWatcher };

// Initialize watcher once at startup
const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";

let globalWatcher: OpenRouterAPIWatcher | null = null;

export async function getGlobalWatcher(): Promise<OpenRouterAPIWatcher> {
  if (!globalWatcher) {
    globalWatcher = await createProductionWatcher({
      dataDir,
      skipInitialization: false, // Will auto-seed if needed
    });
    console.log("Global watcher initialized");
  }
  return globalWatcher;
}

export const app = new App<State>();
// app.use(staticFiles()); // TODO: Fix static files middleware import
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
  console.log(`Database: ${dataDir}/orw.db`);
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

  // For now, always use app.listen - production optimization can come later
  await app.listen({ hostname, port });
}

if (import.meta.main) {
  await serve();
}
