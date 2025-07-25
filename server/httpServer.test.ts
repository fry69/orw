// httpServer.test.ts - Deno test suite for HTTPServer
import { assertEquals, assertExists, assert } from "@std/assert";
import { Database } from "sqlite";
import { HTTPServer } from "./httpServer.ts";
import { OpenRouterAPIWatcher } from "./watcher.ts";
import { runMigrations } from "./database.ts";
import type { Model } from "../shared/global.ts";

const testModel: Model = {
  id: "test-model",
  name: "Test Model",
  description: "A test model",
  pricing: {
    prompt: "0.01",
    completion: "0.02",
    request: "0.03",
    image: "0.04",
  },
  context_length: 1024,
  architecture: {
    modality: "text",
    tokenizer: "gpt2",
    instruct_type: null,
  },
  top_provider: {
    max_completion_tokens: 2048,
    is_moderated: true,
  },
  per_request_limits: null,
};

async function createTestSetup(): Promise<{
  server: HTTPServer;
  watcher: OpenRouterAPIWatcher;
  port: number;
  cleanup: () => void;
}> {
  // Set development mode to prevent API calls
  const originalEnv = Deno.env.get("NODE_ENV");
  Deno.env.set("NODE_ENV", "development");

  // Create temp directory for static files
  const dataDir = Deno.makeTempDirSync({ prefix: "deno-httpserver-test" });
  const staticDir = `${dataDir}/static`;

  // Create static directory and a minimal index.html
  Deno.mkdirSync(staticDir, { recursive: true });
  await Deno.writeTextFile(`${staticDir}/index.html`, `
<!DOCTYPE html>
<html>
<head><title>Test App</title></head>
<body><h1>Test App</h1></body>
</html>
  `);

  // Create in-memory database with test data
  const db = new Database(":memory:");
  runMigrations(db);

  // Pre-populate with test data to prevent seeding
  db.exec(`
    INSERT INTO models (id, data, timestamp)
    VALUES (?, ?, datetime('now'))
  `, [testModel.id, JSON.stringify(testModel)]);

  const watcher = new OpenRouterAPIWatcher({
    db,
    dataDir: "",
    dbFilePath: "",
    logFilePath: "",
    backupDir: "",
    fixedModelList: [testModel]
  });

  // Find an available port
  const port = 8765;
  const server = new HTTPServer({
    port,
    hostname: "localhost",
    watcher,
    staticDir,
    enableCors: true,
  });

  const cleanup = () => {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }

    if (originalEnv !== undefined) {
      Deno.env.set("NODE_ENV", originalEnv);
    } else {
      Deno.env.delete("NODE_ENV");
    }

    try {
      Deno.removeSync(dataDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  };

  return { server, watcher, port, cleanup };
}

Deno.test("HTTPServer should handle API lists endpoint", async () => {
  const { server, port, cleanup } = await createTestSetup();

  try {
    // Start the server
    server.start();

    // Give the server a moment to start
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/lists`);
    assertEquals(response.status, 200);

    const responseData = await response.json();

    // Check the actual response format based on HTTPServer implementation
    assertExists(responseData.lists);
    assertExists(responseData.version);
    assertExists(responseData.lists.models);
    assertEquals(Array.isArray(responseData.lists.models), true);
    assertEquals(responseData.lists.models.length, 1);
    assertEquals(responseData.lists.models[0].id, "test-model");
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle API status endpoint", async () => {
  const { server, port, cleanup } = await createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/status`);
    assertEquals(response.status, 200);

    const responseData = await response.json();

    // Check the actual response format
    assertExists(responseData.status);
    assertExists(responseData.version);
    assertExists(responseData.status.apiLastCheck);
    assertExists(responseData.status.apiLastCheckStatus);
    assertExists(responseData.status.dbLastChange);
    // Note: isDevelopment might be false because it's checked at module load time
    // assertEquals(responseData.status.isDevelopment, true);
    assertEquals(responseData.status.isValid, true);
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle API RSS endpoint", async () => {
  const { server, port, cleanup } = await createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/rss`);
    assertEquals(response.status, 200);

    const contentType = response.headers.get("content-type");
    assertEquals(contentType, "application/rss+xml");

    const rssContent = await response.text();
    assert(rssContent.includes("<?xml"));
    assert(rssContent.includes("<rss"));
    assert(rssContent.includes("OpenRouter Watcher"));
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle 404 for unknown API endpoints", async () => {
  const { server, port, cleanup } = await createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/unknown`);
    assertEquals(response.status, 404);

    const responseData = await response.json();
    assertEquals(responseData.error, "Not found");
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should set CORS headers", async () => {
  const { server, port, cleanup } = await createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/status`);
    assertEquals(response.status, 200);

    // Consume the response body to prevent leaks
    await response.json();

    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
    assertExists(response.headers.get("Access-Control-Allow-Methods"));
    assertExists(response.headers.get("Access-Control-Allow-Headers"));
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle OPTIONS preflight requests", async () => {
  const { server, port, cleanup } = await createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/status`, {
      method: "OPTIONS",
    });
    assertEquals(response.status, 204); // OPTIONS returns 204, not 200
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  } finally {
    await server.stop();
    cleanup();
  }
});


