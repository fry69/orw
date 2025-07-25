// test/helpers/test-setup.ts - Test setup utilities using factory pattern
import { join } from "@std/path";
import { Database } from "sqlite";
import { OpenRouterAPIWatcher } from "../../server/watcher.ts";
import { runMigrations } from "../../server/database.ts";
import { testModels } from "../fixtures/models.ts";
import { testChanges } from "../fixtures/changes.ts";
import type { Model, ModelDiff } from "../../shared/global.ts";

export interface TestContext {
  watcher: OpenRouterAPIWatcher;
  db: Database;
  cleanup: () => Promise<void>;
}

export interface TestServerContext extends TestContext {
  port: number;
  baseUrl: string;
  tempDir: string;
  originalEnv: Record<string, string | undefined>;
  server: AbortController;
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
 * Creates an isolated test server context with temporary directory and unique port
 */
export async function createTestServerContext(): Promise<TestServerContext> {
  // Find a free port for testing (start from 9000 to avoid conflicts)
  const port = await findFreePort(9000);

  // Create temporary directory for isolated test environment
  const tempDir = await Deno.makeTempDir({ prefix: "orw_test_server_" });

  // Store original environment variables
  const originalEnv = {
    ORW_DATA_PATH: Deno.env.get("ORW_DATA_PATH"),
    ORW_PORT: Deno.env.get("ORW_PORT"),
    ORW_HOSTNAME: Deno.env.get("ORW_HOSTNAME"),
    NODE_ENV: Deno.env.get("NODE_ENV"),
  };

  // Set test environment variables
  Deno.env.set("ORW_DATA_PATH", tempDir);
  Deno.env.set("ORW_PORT", port.toString());
  Deno.env.set("ORW_HOSTNAME", "localhost");
  Deno.env.set("NODE_ENV", "test");

  // Create test watcher with isolated data
  const { watcher, db, cleanup: watcherCleanup } = await createTestWatcher({
    models: testModels.slice(0, 5),
    changes: testChanges.slice(0, 3),
    tempDir,
  });

  const baseUrl = `http://localhost:${port}`;
  const server = new AbortController(); // Placeholder for now

  const cleanup = async () => {
    // Stop the server first (when we implement it)
    server.abort();

    // Cleanup watcher
    await watcherCleanup();

    // Remove temporary directory
    await Deno.remove(tempDir, { recursive: true }).catch(() => {
      // Ignore cleanup errors
    });

    // Restore original environment variables
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        Deno.env.delete(key);
      } else {
        Deno.env.set(key, value);
      }
    }
  };

  return {
    watcher,
    db,
    port,
    baseUrl,
    tempDir,
    originalEnv,
    server,
    cleanup,
  };
}

/**
 * Finds a free port starting from the given port number
 */
function findFreePort(startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    for (let port = startPort; port < startPort + 100; port++) {
      try {
        const listener = Deno.listen({ port, hostname: "localhost" });
        listener.close();
        resolve(port);
        return;
      } catch {
        // Port is in use, try next one
        continue;
      }
    }
    reject(new Error(`No free port found in range ${startPort}-${startPort + 100}`));
  });
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
