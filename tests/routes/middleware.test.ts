// tests/routes/middleware.test.ts - Tests for _middleware.ts (common data loading)
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext, testData } from "../helpers/test-setup.ts";

Deno.test({
  name: "Middleware should load common data for regular routes",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Test that middleware loads data by checking a page that should have it
      const response = await fetch(`${serverContext.baseUrl}/changes`);

      // Should respond successfully (middleware didn't fail)
      assertEquals(response.status, 200);

      // Should contain HTML indicating the page loaded
      const html = await response.text();
      assertStringIncludes(html, "<!DOCTYPE html>");
      assertStringIncludes(html, "OpenRouter API Watcher");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Middleware should handle non-existent API routes",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Test API route (should skip middleware data loading)
      const response = await fetch(`${serverContext.baseUrl}/api/nonexistent`);

      // Should get 404 but not crash from middleware
      assertEquals(response.status, 404);
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Middleware should handle error conditions gracefully",
  async fn() {
    // Create context with empty data to simulate potential errors
    const serverContext = await createTestServerContext({
      models: [],
      changes: [],
    });

    try {
      // Test that pages still load even with minimal data
      const response = await fetch(`${serverContext.baseUrl}/changes`);

      // Should still respond successfully even with empty data
      assertEquals(response.status, 200);

      const html = await response.text();
      assertStringIncludes(html, "<!DOCTYPE html>");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
