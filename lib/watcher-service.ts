// lib/watcher-service.ts - Global watcher service for Fresh 2
import { OpenRouterAPIWatcher } from "../server/watcher.ts";
import { createDatabase } from "../server/database.ts";
import { join } from "@std/path";

let globalWatcher: OpenRouterAPIWatcher | null = null;

/**
 * Initialize the global watcher instance
 */
export async function initializeWatcher(): Promise<OpenRouterAPIWatcher> {
  if (globalWatcher) {
    return globalWatcher;
  }

  const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";
  const dbPath = join(dataDir, "orw.db");

  try {
    const db = await createDatabase(dbPath);
    globalWatcher = new OpenRouterAPIWatcher({ db });
    console.log("Watcher service initialized");
    return globalWatcher;
  } catch (error) {
    console.error("Failed to initialize watcher service:", error);
    throw error;
  }
}

/**
 * Get the global watcher instance (initialize if needed)
 */
export async function getWatcher(): Promise<OpenRouterAPIWatcher> {
  if (!globalWatcher) {
    return await initializeWatcher();
  }
  return globalWatcher;
}

/**
 * Check if watcher is initialized
 */
export function isWatcherInitialized(): boolean {
  return globalWatcher !== null;
}
