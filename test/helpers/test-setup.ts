// test/helpers/test-setup.ts - Test setup utilities using factory pattern
import { Database } from "sqlite";
import { OpenRouterAPIWatcher } from "../../server/watcher.ts";
import { createTestWatcher } from "../../server/watcher-factory.ts";
import { testModels } from "../fixtures/models.ts";
import { testChanges } from "../fixtures/changes.ts";

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
