// server/watcher-factory.ts - Factory for creating production watcher instances
import { join } from "@std/path";
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { createDatabase } from "./database.ts";

export interface WatcherConfig {
  dataDir: string;
  dbPath?: string;
  logFilePath?: string;
  backupDir?: string;
  skipInitialization?: boolean;
}

/**
 * Creates a production watcher instance
 */
export async function createProductionWatcher(
  config: WatcherConfig,
): Promise<OpenRouterAPIWatcher> {
  const dbPath = config.dbPath || join(config.dataDir, "orw.db");
  const db = await createDatabase(dbPath);

  const watcherConfig = {
    db,
    dataDir: config.dataDir,
    dbFilePath: dbPath,
    logFilePath: config.logFilePath || join(config.dataDir, "orw.log"),
    backupDir: config.backupDir || join(config.dataDir, "backup"),
  };

  const watcher = new OpenRouterAPIWatcher(watcherConfig);

  if (!config.skipInitialization) {
    await watcher.initialize({ seed: true });
  }

  return watcher;
}
