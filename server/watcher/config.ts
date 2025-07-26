// server/watcher/config.ts - Watcher configuration utilities
import { join } from "@std/path";
import type { Model } from "../../types/global.ts";

export interface WatcherConfig {
  dataDir: string;
  dbFilePath: string;
  logFilePath: string;
  backupDir: string;
  fixedModelList?: Model[];
}

/**
 * Get watcher configuration from environment variables with sensible defaults
 */
export function getWatcherConfig(overrides: Partial<WatcherConfig> = {}): WatcherConfig {
  const dataDir = overrides.dataDir || Deno.env.get("ORW_DATA_PATH") || "./data";

  return {
    dataDir,
    dbFilePath: overrides.dbFilePath || (Deno.env.get("ORW_DB_PATH") ?? join(dataDir, "orw.db")),
    logFilePath: overrides.logFilePath ||
      (Deno.env.get("ORW_LOG_PATH") ?? join(dataDir, "orw.log")),
    backupDir: overrides.backupDir || Deno.env.get("ORW_BACKUP_PATH") || join(dataDir, "backup"),
    fixedModelList: overrides.fixedModelList,
  };
}
