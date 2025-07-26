// server/app.ts - Application service layer
import { join } from "@std/path";
import { OpenRouterAPIWatcher } from "./watcher/index.ts";
import { createDatabase, runMigrations } from "./database/index.ts";

export interface AppConfig {
  dataDir: string;
  dbPath?: string;
  logFilePath?: string;
  backupDir?: string;
  enableWatcher?: boolean;
}

let globalWatcher: OpenRouterAPIWatcher | null = null;

/**
 * Get application configuration from environment variables
 */
function getAppConfig(): AppConfig {
  const dataDir = Deno.env.get("ORW_DATA_PATH") || "./data";

  return {
    dataDir,
    dbPath: Deno.env.get("ORW_DB_PATH") ?? join(dataDir, "orw.db"),
    logFilePath: Deno.env.get("ORW_LOG_PATH") ?? join(dataDir, "orw.log"),
    backupDir: Deno.env.get("ORW_BACKUP_PATH") || join(dataDir, "backup"),
  };
}

/**
 * Create a watcher instance with the given configuration
 */
async function createWatcher(
  config: AppConfig,
  options: { seed?: boolean } = {},
): Promise<OpenRouterAPIWatcher> {
  const dbPath = config.dbPath || join(config.dataDir, "orw.db");
  const db = await createDatabase(dbPath);

  // Run migrations to ensure database is up to date
  runMigrations(db);

  const watcherConfig = {
    db,
    dataDir: config.dataDir,
    dbFilePath: dbPath,
    logFilePath: config.logFilePath || join(config.dataDir, "orw.log"),
    backupDir: config.backupDir || join(config.dataDir, "backup"),
  };

  const watcher = new OpenRouterAPIWatcher(watcherConfig);
  await watcher.initialize({ seed: options.seed });

  return watcher;
}

/**
 * Get or create the global watcher instance
 */
export async function getGlobalWatcher(): Promise<OpenRouterAPIWatcher> {
  if (!globalWatcher) {
    const config = getAppConfig();
    globalWatcher = await createWatcher(config, { seed: true });
    console.log("Global watcher initialized");
  }
  return globalWatcher;
}

/**
 * Reset the global watcher (primarily for testing)
 */
export function resetGlobalWatcher(): void {
  globalWatcher = null;
}

/**
 * Create a watcher instance for CLI usage
 */
export async function createCliWatcher(options: {
  dataDir?: string;
  seed?: boolean;
} = {}): Promise<OpenRouterAPIWatcher> {
  const config = {
    ...getAppConfig(),
    ...options,
  };

  return await createWatcher(config, { seed: options.seed });
}

// Re-export serve function for convenience
export { serve } from "./serve.ts";
