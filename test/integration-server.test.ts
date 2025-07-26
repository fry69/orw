// test/integration-server.test.ts - Integration test to catch server startup issues
import { assertEquals, assertMatch } from "@std/assert";

const TEST_PORT = 9999; // Use a different port to avoid conflicts

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(port: number, maxAttempts = 3): Promise<boolean> {
  console.log(`Waiting for server on port ${port}...`);
  await sleep(500); // give the server a bit time to startup
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, {
        method: "GET",
      });
      if (response.status === 200) {
        console.log(`Server ready after ${i + 1} attempts`);
        return true;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.log(`Attempt ${i + 1}: Server not ready (${errorMsg})`);
      await sleep(500);
    }
  }
  return false;
}

function startTestServer() {
  const command = new Deno.Command("deno", {
    args: [
      "serve",
      "--allow-all",
      "--port",
      TEST_PORT.toString(),
      "_fresh/server.js",
    ],
    env: {
      ORW_DISABLE_WATCHER: "true", // Disable watcher for testing
      ORW_DATA_PATH: "./test-data", // Use test data directory
      ORW_SEED_DATABASE: "false", // Don't seed for tests
    },
    cwd: Deno.cwd(),
    stdout: "piped",
    stderr: "piped",
  });

  return command.spawn();
}

Deno.test.ignore("Production server starts and serves routes correctly", async () => {
  let process: Deno.ChildProcess | undefined;

  try {
    console.log("Starting test server...");
    process = startTestServer();

    // Wait for server to start
    const serverStarted = await waitForServer(TEST_PORT);
    assertEquals(serverStarted, true, "Server should start within 3 seconds");

    console.log("Testing root route (should redirect)...");
    // Test root route - should redirect to /changes
    const rootResponse = await fetch(`http://localhost:${TEST_PORT}/`);
    const rootContent = await rootResponse.text();
    console.log(`Root route response: ${rootResponse.status} ${rootResponse.statusText}`);
    console.log(`Location header: ${rootResponse.headers.get("location")}`);
    console.log(`Content-Type: ${rootResponse.headers.get("content-type")}`);
    console.log(`Response body (first 200 chars): ${rootContent.substring(0, 200)}`);
    assertEquals(rootResponse.status, 302, "Root route should redirect");
    assertEquals(rootResponse.headers.get("location"), "/changes", "Should redirect to /changes");

    console.log("Testing changes route...");
    // Test changes route - should return HTML
    const changesResponse = await fetch(`http://localhost:${TEST_PORT}/changes`);
    assertEquals(changesResponse.status, 200, "Changes route should return 200");
    assertEquals(
      changesResponse.headers.get("content-type")?.includes("text/html"),
      true,
      "Should return HTML",
    );

    const changesContent = await changesResponse.text();
    assertMatch(changesContent, /OpenRouter.*Changes/, "Should contain expected content");

    console.log("Testing API route...");
    // Test API route
    const apiResponse = await fetch(`http://localhost:${TEST_PORT}/api/status`);
    assertEquals(apiResponse.status, 200, "API status route should return 200");
    assertEquals(
      apiResponse.headers.get("content-type")?.includes("application/json"),
      true,
      "Should return JSON",
    );

    const apiContent = await apiResponse.json();
    assertEquals(typeof apiContent.status, "object", "Should return status object");

    console.log("Testing 404 route...");
    // Test 404 route
    const notFoundResponse = await fetch(`http://localhost:${TEST_PORT}/nonexistent`);
    assertEquals(notFoundResponse.status, 404, "Non-existent route should return 404");

    console.log("All integration tests passed!");
  } finally {
    if (process) {
      console.log("Terminating test server...");
      process.kill("SIGTERM");

      // Wait for process to exit
      const status = await process.status;
      console.log(`Server process exited with code: ${status.code}`);
    }
  }
});
