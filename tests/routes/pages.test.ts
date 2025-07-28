// tests/routes/pages.test.ts - Tests for page routes (changes.tsx, list.tsx, removed.tsx)
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext, testData } from "../helpers/test-setup.ts";

Deno.test({
  name: "Changes page should render successfully",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);

      assertEquals(response.status, 200);
      assertEquals(response.headers.get("content-type"), "text/html; charset=utf-8");

      const html = await response.text();

      // Basic HTML structure
      assertStringIncludes(html, "<!DOCTYPE html>");
      assertStringIncludes(html, "<html");
      assertStringIncludes(html, "</html>");

      // Page title and meta
      assertStringIncludes(html, "<title>OpenRouter API Watcher</title>");
      assertStringIncludes(html, "Explore OpenRouter");
      assertStringIncludes(html, "model list and recorded changes");

      // Should contain main content structure
      assertStringIncludes(html, 'class="main-content"');

      // CSS and favicon
      assertStringIncludes(html, "/app.css");
      assertStringIncludes(html, "/favicon.svg");

      // RSS feed link
      assertStringIncludes(html, 'type="application/rss+xml"');
      assertStringIncludes(html, 'href="/rss"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Model list page should render successfully",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/list`);

      assertEquals(response.status, 200);
      assertEquals(response.headers.get("content-type"), "text/html; charset=utf-8");

      const html = await response.text();

      // Basic HTML structure
      assertStringIncludes(html, "<!DOCTYPE html>");
      assertStringIncludes(html, "<html");
      assertStringIncludes(html, "</html>");

      // Page title
      assertStringIncludes(html, "<title>OpenRouter API Watcher</title>");

      // Should contain main content structure
      assertStringIncludes(html, 'class="main-content"');

      // Should contain ModelList component reference
      assertStringIncludes(html, 'class="model-list"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Removed models page should render successfully",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/removed`);

      assertEquals(response.status, 200);
      assertEquals(response.headers.get("content-type"), "text/html; charset=utf-8");

      const html = await response.text();

      // Basic HTML structure
      assertStringIncludes(html, "<!DOCTYPE html>");
      assertStringIncludes(html, "<html");
      assertStringIncludes(html, "</html>");

      // Page title
      assertStringIncludes(html, "<title>OpenRouter API Watcher</title>");

      // Should contain main content structure
      assertStringIncludes(html, 'class="main-content"');

      // Should contain ModelList component with removed prop
      assertStringIncludes(html, 'class="model-list"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "All pages should include navigation",
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

        // Should contain navigation elements (using actual HTML structure)
        assertStringIncludes(html, "<nav>");
        assertStringIncludes(html, "<ul>");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "All pages should include DataInitializer with common data",
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

        // Should contain Fresh runtime boot script (instead of window.__FRESH_DATA)
        assertStringIncludes(html, "boot(");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "Pages should handle empty data gracefully",
  async fn() {
    const serverContext = await createTestServerContext({
      models: [],
      changes: [],
    });

    try {
      const pages = ["/changes", "/list", "/removed"];

      for (const page of pages) {
        const response = await fetch(`${serverContext.baseUrl}${page}`);

        // Should still render successfully even with no data
        assertEquals(response.status, 200);

        const html = await response.text();
        assertStringIncludes(html, "<!DOCTYPE html>");
        assertStringIncludes(html, "<title>OpenRouter API Watcher</title>");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
