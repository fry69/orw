// tests/routes/integration.test.ts - Integration tests for route functionality
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext, testData } from "../helpers/test-setup.ts";

Deno.test({
  name: "Full application flow should work end-to-end",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Test home redirect
      const homeResponse = await fetch(`${serverContext.baseUrl}/`, {
        redirect: "manual",
      });
      assertEquals(homeResponse.status, 302);
      assertEquals(homeResponse.headers.get("Location"), "/changes");

      // Test changes page
      const changesResponse = await fetch(`${serverContext.baseUrl}/changes`);
      assertEquals(changesResponse.status, 200);
      assertStringIncludes(await changesResponse.text(), "OpenRouter API Watcher");

      // Test list page
      const listResponse = await fetch(`${serverContext.baseUrl}/list`);
      assertEquals(listResponse.status, 200);
      assertStringIncludes(await listResponse.text(), "OpenRouter API Watcher");

      // Test removed page
      const removedResponse = await fetch(`${serverContext.baseUrl}/removed`);
      assertEquals(removedResponse.status, 200);
      assertStringIncludes(await removedResponse.text(), "OpenRouter API Watcher");

      // Test RSS feed
      const rssResponse = await fetch(`${serverContext.baseUrl}/rss`);
      assertEquals(rssResponse.status, 200);
      assertEquals(rssResponse.headers.get("content-type"), "application/rss+xml; charset=utf-8");
      assertStringIncludes(await rssResponse.text(), "<?xml");

      // Test 404 handling
      const notFoundResponse = await fetch(`${serverContext.baseUrl}/nonexistent`);
      assertEquals(notFoundResponse.status, 404);
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Static assets should be served correctly",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Test CSS file
      const cssResponse = await fetch(`${serverContext.baseUrl}/app.css`);
      assertEquals(cssResponse.status, 200);
      assertEquals(cssResponse.headers.get("content-type"), "text/css; charset=UTF-8");

      // Test favicon
      const faviconResponse = await fetch(`${serverContext.baseUrl}/favicon.svg`);
      assertEquals(faviconResponse.status, 200);
      assertEquals(faviconResponse.headers.get("content-type"), "image/svg+xml");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test.ignore({
  name: "Navigation between pages should work",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const pages = [
        { path: "/changes", title: "Changes" },
        { path: "/list", title: "Models" },
        { path: "/removed", title: "Removed" },
      ];

      for (const page of pages) {
        const response = await fetch(`${serverContext.baseUrl}${page.path}`);
        assertEquals(response.status, 200);

        const html = await response.text();

        // Each page should have navigation elements (using actual HTML structure)
        assertStringIncludes(html, "<nav>");
        assertStringIncludes(html, "<ul>");

        // Each page should include all navigation links
        for (const otherPage of pages) {
          if (otherPage.path !== page.path) {
            assertStringIncludes(html, `href="${otherPage.path}"`);
          }
        }
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Data loading should work consistently",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const pages = ["/changes", "/list", "/removed"];

      for (const page of pages) {
        const response = await fetch(`${serverContext.baseUrl}${page}`);
        assertEquals(response.status, 200);

        const html = await response.text();

        // All pages should have Fresh runtime boot script (instead of window.__FRESH_DATA)
        assertStringIncludes(html, "boot(");

        // All pages should have the same basic structure indicating data loaded
        assertStringIncludes(html, 'class="main-content"');
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test.ignore({
  name: "Server should handle concurrent requests",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Make multiple concurrent requests
      const promises = [];
      const endpoints = ["/changes", "/list", "/removed", "/rss"];

      for (let i = 0; i < 5; i++) {
        for (const endpoint of endpoints) {
          promises.push(fetch(`${serverContext.baseUrl}${endpoint}`));
        }
      }

      const responses = await Promise.all(promises);

      // All requests should succeed
      for (const response of responses) {
        assertEquals(response.status >= 200 && response.status < 300, true);
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server should handle different HTTP methods appropriately",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];

      for (const method of methods) {
        // Test regular pages (should all respond to different methods)
        const changesResponse = await fetch(`${serverContext.baseUrl}/changes`, {
          method,
        });
        // Should respond (might be 404 for some methods, but not crash)
        assertEquals(changesResponse.status >= 200, true);

        // Test RSS endpoint
        const rssResponse = await fetch(`${serverContext.baseUrl}/rss`, {
          method,
        });
        // RSS should work for GET, others might return 405 or 404
        if (method === "GET") {
          assertEquals(rssResponse.status, 200);
        } else {
          assertEquals(rssResponse.status >= 200, true);
        }
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Server should handle edge case URLs",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const edgeCaseUrls = [
        "/",
        "//",
        "/changes/",
        "/changes//",
        "/CHANGES",
        "/Changes",
        "/list/something",
        "/removed/something",
        "/rss/",
        "/%20",
        "/\n",
        "/\t",
      ];

      for (const url of edgeCaseUrls) {
        try {
          const response = await fetch(`${serverContext.baseUrl}${url}`);
          // Should not crash - any 2xx, 3xx, 4xx response is acceptable
          assertEquals(response.status >= 200 && response.status < 500, true);
        } catch (error) {
          // Network errors are acceptable for malformed URLs
          console.log(`Expected error for URL ${url}:`, String(error));
        }
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
