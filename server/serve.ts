// server/serve.ts - Server startup logic
import { app } from "../main.ts";
import { getGlobalWatcher } from "./app.ts";

/**
 * Start the application server
 */
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

  console.log("Fresh app imported successfully"); // Initialize watcher
  console.log("Initializing global watcher...");
  const watcher = await getGlobalWatcher();
  console.log("Global watcher initialized successfully");

  const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";
  const dbPath = Deno.env.get("ORW_DB_PATH") || `${dataDir}/orw.db`;

  console.log(`ORW (Fresh 2) starting...`);
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

  await app.listen({ hostname, port });
}
