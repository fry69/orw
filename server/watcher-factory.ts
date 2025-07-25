// server/watcher-factory.ts - Factory for creating watcher instances
import { join } from "@std/path";
import { Database } from "sqlite";
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { createDatabase, runMigrations } from "./database.ts";
import type { Model, ModelDiff } from "../shared/global.ts";

export interface WatcherConfig {
  dataDir: string;
  dbPath?: string;
  logFilePath?: string;
  backupDir?: string;
  skipInitialization?: boolean;
}

export interface TestWatcherConfig {
  models: Model[];
  changes: ModelDiff[];
  tempDir?: string;
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

/**
 * Creates a test watcher instance with controlled data
 */
export async function createTestWatcher(config: TestWatcherConfig): Promise<{
  watcher: OpenRouterAPIWatcher;
  db: Database;
  cleanup: () => Promise<void>;
}> {
  // Create temporary directory if not provided
  const tempDir = config.tempDir || await Deno.makeTempDir({ prefix: "orw_test_" });
  const dbPath = join(tempDir, "test.db");

  // Set test environment
  const originalEnv = Deno.env.get("NODE_ENV");
  Deno.env.set("NODE_ENV", "test");

  // Create in-memory or temp database
  const db = new Database(dbPath);
  runMigrations(db);

  // Populate with test data
  populateTestData(db, config.models, config.changes);

  const watcherConfig = {
    db,
    dataDir: tempDir,
    dbFilePath: dbPath,
    logFilePath: "", // Disable log file for tests
    backupDir: "", // Disable backup for tests
    fixedModelList: config.models, // Use fixed list to prevent API calls
  };

  const watcher = new OpenRouterAPIWatcher(watcherConfig);
  await watcher.initialize({ seed: false, skipAPI: true });

  const cleanup = async () => {
    db.close();
    await Deno.remove(tempDir, { recursive: true }).catch(() => {
      // Ignore cleanup errors
    });

    // Restore environment
    if (originalEnv) {
      Deno.env.set("NODE_ENV", originalEnv);
    } else {
      Deno.env.delete("NODE_ENV");
    }
  };

  return { watcher, db, cleanup };
}

/**
 * Populates database with test data
 */
function populateTestData(db: Database, models: Model[], changes: ModelDiff[]) {
  // Insert test models
  for (const model of models) {
    const timestamp = new Date().toISOString();
    db.exec(
      `INSERT INTO models (id, data, timestamp) VALUES (?, ?, ?)`,
      [model.id, JSON.stringify(model), timestamp],
    );
    // Also insert into added_models table
    db.exec(
      `INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)`,
      [model.id, JSON.stringify(model), timestamp],
    );
  }

  // Insert test changes
  for (const change of changes) {
    db.exec(
      `INSERT INTO changes (id, changes, timestamp, type) VALUES (?, ?, ?, ?)`,
      [change.id, JSON.stringify(change.changes || change.model), change.timestamp, change.type],
    );

    // Insert into type-specific tables
    if (change.type === "added" && change.model) {
      db.exec(
        `INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)`,
        [change.id, JSON.stringify(change.model), change.timestamp],
      );
    } else if (change.type === "removed" && change.model) {
      db.exec(
        `INSERT INTO removed_models (id, data, timestamp) VALUES (?, ?, ?)`,
        [change.id, JSON.stringify(change.model), change.timestamp],
      );
    }
  }

  // Set last API check status
  db.exec(
    `INSERT INTO last_api_check (id, last_check, last_status) VALUES (1, datetime('now'), 'success')`,
  );
}
