// test/helpers/test-setup.ts - Test setup utilities using factory pattern
import { join } from "@std/path";
import { DatabaseSync } from "sqlite";
import { OpenRouterAPIWatcher } from "../../server/watcher.ts";
import { runMigrations } from "../../server/database/index.ts";
import { testModels } from "../fixtures/models.ts";
import { testChanges } from "../fixtures/changes.ts";
import type { Model, ModelDiff } from "../../lib/types.ts";

export interface TestContext {
  watcher: OpenRouterAPIWatcher;
  db: DatabaseSync;
  cleanup: () => Promise<void>;
}

export interface TestServerContext {
  watcher: OpenRouterAPIWatcher;
  db: DatabaseSync;
  cleanup: () => Promise<void>;
  port: number;
  baseUrl: string;
  tempDir: string;
  originalEnv: Record<string, string | undefined>;
  handler: (request: Request) => Response | Promise<Response>;
  shutdown: () => Promise<void>;
}

export interface TestWatcherConfig {
  models: Model[];
  changes: ModelDiff[];
  tempDir?: string;
}

/**
 * Creates a test watcher instance with controlled data
 */
export async function createTestWatcher(config: TestWatcherConfig): Promise<{
  watcher: OpenRouterAPIWatcher;
  db: DatabaseSync;
  cleanup: () => Promise<void>;
}> {
  // Create temporary directory if not provided
  const tempDir = config.tempDir || await Deno.makeTempDir({ prefix: "orw_test_" });
  const dbPath = join(tempDir, "test.db");

  // Set test environment
  const originalEnv = Deno.env.get("NODE_ENV");
  Deno.env.set("NODE_ENV", "test");

  // Create in-memory or temp database
  const db = new DatabaseSync(dbPath);
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
function populateTestData(db: DatabaseSync, models: Model[], changes: ModelDiff[]) {
  // Insert test models
  const insertModel = db.prepare("INSERT INTO models (id, data, timestamp) VALUES (?, ?, ?)");
  const insertAddedModel = db.prepare(
    "INSERT INTO added_models (id, data, timestamp) VALUES (?, ?, ?)",
  );

  for (const model of models) {
    const timestamp = new Date().toISOString();
    insertModel.run(model.id, JSON.stringify(model), timestamp);
    // Also insert into added_models table
    insertAddedModel.run(model.id, JSON.stringify(model), timestamp);
  }

  // Insert test changes
  const insertChange = db.prepare(
    "INSERT INTO changes (id, changes, timestamp, type) VALUES (?, ?, ?, ?)",
  );
  const insertRemovedModel = db.prepare(
    "INSERT INTO removed_models (id, data, timestamp) VALUES (?, ?, ?)",
  );

  for (const change of changes) {
    insertChange.run(
      change.id,
      JSON.stringify(change.changes || change.model),
      change.timestamp,
      change.type,
    );

    // Insert into type-specific tables
    if (change.type === "added" && change.model) {
      insertAddedModel.run(change.id, JSON.stringify(change.model), change.timestamp);
    } else if (change.type === "removed" && change.model) {
      insertRemovedModel.run(change.id, JSON.stringify(change.model), change.timestamp);
    }
  }

  // Set last API check status
  const insertLastCheck = db.prepare(
    "INSERT INTO last_api_check (id, last_check, last_status) VALUES (1, ?, 'success')",
  );
  insertLastCheck.run(new Date().toISOString());
}

/**
 * Creates a test context with a pre-populated watcher and database using the factory
 */
export async function createTestContext(): Promise<TestContext> {
  return await createTestWatcher({
    models: testModels.slice(0, 10), // Use subset for faster tests
    changes: testChanges.slice(0, 5),
  });
}

/**
 * Sets up isolated test environment for server testing
 */
async function setupTestEnvironment(config: TestWatcherConfig): Promise<{
  watcher: OpenRouterAPIWatcher;
  db: DatabaseSync;
  cleanup: () => Promise<void>;
  tempDir: string;
  baseUrl: string;
  originalEnv: Record<string, string | undefined>;
}> {
  // Create temporary directory if not provided
  const tempDir = config.tempDir || await Deno.makeTempDir({ prefix: "orw_test_server_" });
  const dbPath = join(tempDir, "test.db");

  // Store original environment
  const originalEnv = {
    NODE_ENV: Deno.env.get("NODE_ENV"),
    ORW_DB_PATH: Deno.env.get("ORW_DB_PATH"),
    ORW_DATA_DIR: Deno.env.get("ORW_DATA_DIR"),
    ORW_DEV_MODE: Deno.env.get("ORW_DEV_MODE"),
    ORW_DISABLE_WATCHER: Deno.env.get("ORW_DISABLE_WATCHER"),
    ORW_SEED_DATABASE: Deno.env.get("ORW_SEED_DATABASE"),
  };

  // Set test environment
  Deno.env.set("NODE_ENV", "test");
  Deno.env.set("ORW_DB_PATH", dbPath);
  Deno.env.set("ORW_DATA_DIR", tempDir);
  Deno.env.set("ORW_DEV_MODE", "false"); // Disable dev mode for tests
  Deno.env.set("ORW_DISABLE_WATCHER", "true"); // Disable background watcher for tests
  Deno.env.set("ORW_SEED_DATABASE", "false"); // Don't seed database in tests

  // Create and populate database
  const db = new DatabaseSync(dbPath);
  runMigrations(db);
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
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value !== undefined) {
        Deno.env.set(key, value);
      } else {
        Deno.env.delete(key);
      }
    }
  };

  return {
    watcher,
    db,
    cleanup,
    tempDir,
    baseUrl: `http://localhost:8000`,
    originalEnv,
  };
}

/**
 * Test server context for HTTP endpoint testing
 */
export async function createTestServerContext(
  config: TestWatcherConfig,
): Promise<TestServerContext> {
  const testEnv = await setupTestEnvironment(config);

  // Create Fresh 2 test server using Builder pattern from dev.ts
  const { Builder } = await import("fresh/dev");
  const { tailwind } = await import("@fresh/plugin-tailwind");

  const builder = new Builder();
  tailwind(builder);

  // Build the snapshot for testing (similar to Fresh testing docs)
  const applySnapshot = await builder.build({ snapshot: "memory" });

  // Import the app and apply snapshot
  const appModule = await import("../../main.ts");
  applySnapshot(appModule.app);

  // Create handler for testing
  const handler = appModule.app.handler();

  // Start HTTP server on port 8000 for testing
  const server = Deno.serve({
    port: 8000,
    hostname: "localhost",
  }, handler);

  return {
    ...testEnv,
    port: 8000,
    handler,
    shutdown: async () => {
      await server.shutdown();
      await testEnv.cleanup();
    },
  };
}

/**
 * Waits for a server to become available at the given URL
 */
export async function waitForServer(
  url: string,
  maxAttempts = 30,
  delayMs = 100,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(1000), // 1 second timeout per attempt
      });
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet, wait and retry
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

/**
 * Common test data for use across test files
 */
export const testData = {
  models: testModels.slice(0, 3),
  changes: testChanges.slice(0, 2),
};

// Export small test dataset for quick tests
export const sampleModel = testModels[0];
export const sampleChange = testChanges[0];
