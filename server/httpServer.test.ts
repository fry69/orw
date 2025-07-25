// httpServer.test.ts
import { join } from "@std/path";
import { assertEquals, assertExists, assert } from "@std/assert";
import { Database } from "sqlite";
import { HTTPServer } from "./httpServer.ts";
import { OpenRouterAPIWatcher } from "./watcher.ts";
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

function createTestSetup(): {
  server: HTTPServer;
  watcher: OpenRouterAPIWatcher;
  dataDir: string;
  port: number;
  cleanup: () => void;
} {
  const dataDir = Deno.makeTempDirSync({ prefix: "deno-httpserver-test" });
  const backupDir = join(dataDir, "backup");
  const staticDir = join(dataDir, "static");

  // Create static directory
  Deno.mkdirSync(staticDir, { recursive: true });

  // Store original console methods and environment
  const originalLog = console.log;
  const originalError = console.error;
  const originalEnv = Deno.env.get("NODE_ENV");

  // Set development mode to use fixed model list and prevent API calls
  Deno.env.set("NODE_ENV", "development");

  // Silence console output
  console.log = () => {};
  console.error = () => {};

  const db = new Database(":memory:");
  const watcher = new OpenRouterAPIWatcher({
    db,
    dataDir,
    backupDir,
    logFilePath: "",
    dbFilePath: "",
    fixedModelList: [testModel]
  });

  // Use a specific port for testing (hopefully available)
  const port = 8765;
  const server = new HTTPServer({
    port,
    watcher,
    staticDir,
  });

  const cleanup = () => {
    db.close();
    console.log = originalLog;
    console.error = originalError;
    // Restore original environment
    if (originalEnv) {
      Deno.env.set("NODE_ENV", originalEnv);
    } else {
      Deno.env.delete("NODE_ENV");
    }
    try {
      Deno.removeSync(dataDir, { recursive: true });
    } catch {
      // Ignore errors if directory doesn't exist
    }
  };

  return { server, watcher, dataDir, port, cleanup };
}

Deno.test("HTTPServer should handle API lists endpoint", async () => {
  const { server, port, cleanup } = createTestSetup();

  try {
    // Start the server
    server.start();

    // Give the server a moment to start
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/lists`);
    assertEquals(response.status, 200);

    const responseData = await response.json();
    assertExists(responseData.models);
    assertEquals(Array.isArray(responseData.models), true);
    assertEquals(responseData.models.length, 1);
    assertEquals(responseData.models[0].id, "test-model");
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle API status endpoint", async () => {
  const { server, port, cleanup } = createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/status`);
    assertEquals(response.status, 200);

    const responseData = await response.json();
    assertExists(responseData.apiLastCheck);
    assertExists(responseData.apiLastCheckStatus);
    assertExists(responseData.dbLastChange);
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle API RSS endpoint", async () => {
  const { server, port, cleanup } = createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/rss`);
    assertEquals(response.status, 200);

    const contentType = response.headers.get("content-type");
    assert(contentType?.includes("application/rss+xml") || contentType?.includes("application/xml"));

    const rssContent = await response.text();
    assert(rssContent.includes("<?xml"));
    assert(rssContent.includes("<rss"));
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle 404 for unknown API endpoints", async () => {
  const { server, port, cleanup } = createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/unknown`);
    assertEquals(response.status, 404);

    const responseText = await response.text();
    assert(responseText.includes("not found") || responseText.includes("Not Found"));
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should set CORS headers", async () => {
  const { server, port, cleanup } = createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/status`);
    assertEquals(response.status, 200);

    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
    assertExists(response.headers.get("Access-Control-Allow-Methods"));
  } finally {
    await server.stop();
    cleanup();
  }
});

Deno.test("HTTPServer should handle OPTIONS preflight requests", async () => {
  const { server, port, cleanup } = createTestSetup();

  try {
    server.start();
    await new Promise(resolve => setTimeout(resolve, 100));

    const response = await fetch(`http://localhost:${port}/api/status`, {
      method: "OPTIONS",
    });
    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Access-Control-Allow-Origin"), "*");
  } finally {
    await server.stop();
    cleanup();
  }
});


