// tests/routes/error.test.ts - Tests for _error.tsx (error handling)
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext, testData } from "../helpers/test-setup.ts";

Deno.test({
  name: "Server should handle 404 errors",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/nonexistent-page`);

      assertEquals(response.status, 404);

      const html = await response.text();

      // Should still return HTML (error page)
      assertStringIncludes(html, "<!DOCTYPE html>");
      // Should contain error message
      assertStringIncludes(html, "404");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server should handle malformed URLs gracefully",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Test with various potentially problematic URLs
      const problematicUrls = [
        "/this/does/not/exist",
        "/api/nonexistent",
        "/changes/invalid",
        "/list/invalid/path",
      ];

      for (const url of problematicUrls) {
        const response = await fetch(`${serverContext.baseUrl}${url}`);

        // Should respond (not throw) and return 404
        assertEquals(response.status, 404);

        // Should return HTML content
        const html = await response.text();
        assertStringIncludes(html, "<!DOCTYPE html>");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Error responses should have proper content type",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/does-not-exist`);

      assertEquals(response.status, 404);

      // Should return HTML content type
      const contentType = response.headers.get("content-type");
      assertEquals(contentType, "text/html; charset=utf-8");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Error page should work with different HTTP methods",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const methods = ["GET", "POST", "PUT", "DELETE"];

      for (const method of methods) {
        const response = await fetch(`${serverContext.baseUrl}/nonexistent`, {
          method,
        });

        // All should return 404 (method not affecting error handling)
        assertEquals(response.status, 404);

        const html = await response.text();
        assertStringIncludes(html, "<!DOCTYPE html>");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
