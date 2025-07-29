import { createDatabase, runMigrations } from "./database/index.ts";
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { join } from "@std/path";

// Watcher instance - single source of truth
let watcherInstance: OpenRouterAPIWatcher | null = null;

/**
 * Get or create the watcher instance singleton
 */
export async function getWatcher(): Promise<OpenRouterAPIWatcher> {
  if (!watcherInstance) {
    await initializeWatcher();
  }
  return watcherInstance!;
}

/**
 * Initialize the application watcher
 */
export async function initializeWatcher(): Promise<void> {
  if (watcherInstance) return; // Already initialized

  console.log("Initializing ORW...");

  // Get configuration from environment
  const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";
  const dbPath = Deno.env.get("ORW_DB_PATH") || join(dataDir, "orw.db");
  const logFilePath = Deno.env.get("ORW_LOG_PATH") || join(dataDir, "orw.log");
  const backupDir = Deno.env.get("ORW_BACKUP_PATH") || join(dataDir, "backup");
  const enableWatcher = Deno.env.get("ORW_DISABLE_WATCHER") !== "true";
  const seedDatabase = Deno.env.get("ORW_SEED_DATABASE") !== "false";

  console.log(`Data directory: ${dataDir}`);
  console.log(`Database: ${dbPath}`);
  console.log(`Watcher enabled: ${enableWatcher}`);

  try {
    // Create database and run migrations
    const db = await createDatabase(dbPath);
    runMigrations(db);

    const watcherConfig = {
      db,
      dataDir,
      dbFilePath: dbPath,
      logFilePath,
      backupDir,
    };

    watcherInstance = new OpenRouterAPIWatcher(watcherConfig);
    await watcherInstance.initialize({ seed: seedDatabase });

    if (enableWatcher) {
      console.log("Starting background watcher...");
      // Don't await - let it run in the background
      watcherInstance.enterBackgroundMode().catch((error) => {
        console.error("Background watcher error:", error);
      });
    } else {
      console.log("Background watcher disabled");
    }

    console.log("ORW initialized successfully");
  } catch (error) {
    console.error("ORW initialization failed:", error);
    throw error;
  }
}
