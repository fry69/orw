// tests/routes/app.test.ts - Tests for _app.tsx (root layout)
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext, testData } from "../helpers/test-setup.ts";

Deno.test({
  name: "App layout should include proper HTML structure",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);

      assertEquals(response.status, 200);
      const html = await response.text();

      // Basic HTML5 structure
      assertStringIncludes(html, "<!DOCTYPE html>");
      assertStringIncludes(html, '<html lang="en">');
      assertStringIncludes(html, "<head>");
      assertStringIncludes(html, "</head>");
      assertStringIncludes(html, "<body>");
      assertStringIncludes(html, "</body>");
      assertStringIncludes(html, "</html>");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include essential meta tags",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // Basic meta tags
      assertStringIncludes(html, '<meta charset="utf-8"');
      assertStringIncludes(html, 'name="viewport"');
      assertStringIncludes(html, 'content="width=device-width, initial-scale=1.0"');

      // SEO meta tags
      assertStringIncludes(html, 'name="description"');
      assertStringIncludes(html, "Explore OpenRouter");
      assertStringIncludes(html, "model list and recorded changes");

      // Theme color
      assertStringIncludes(html, 'name="theme-color"');
      assertStringIncludes(html, 'content="#444"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include Open Graph meta tags",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // Open Graph tags
      assertStringIncludes(html, 'property="og:url"');
      assertStringIncludes(html, 'content="https://orw.karleo.net"');
      assertStringIncludes(html, 'property="og:type"');
      assertStringIncludes(html, 'content="website"');
      assertStringIncludes(html, 'property="og:title"');
      assertStringIncludes(html, 'content="OpenRouter API Watcher"');
      assertStringIncludes(html, 'property="og:description"');
      assertStringIncludes(html, 'property="og:image"');
      assertStringIncludes(html, 'content="https://orw.karleo.net/screenshot.png"');
      assertStringIncludes(html, 'property="og:image:type"');
      assertStringIncludes(html, 'content="image/png"');
      assertStringIncludes(html, 'property="og:image:width"');
      assertStringIncludes(html, 'content="1200"');
      assertStringIncludes(html, 'property="og:image:height"');
      assertStringIncludes(html, 'content="630"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include Twitter meta tags",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // Twitter Card tags
      assertStringIncludes(html, 'name="twitter:card"');
      assertStringIncludes(html, 'content="summary_large_image"');
      assertStringIncludes(html, 'property="twitter:title"');
      assertStringIncludes(html, 'content="OpenRouter API Watcher"');
      assertStringIncludes(html, 'property="twitter:domain"');
      assertStringIncludes(html, 'content="orw.karleo.net"');
      assertStringIncludes(html, 'property="twitter:url"');
      assertStringIncludes(html, 'content="https://orw.karleo.net"');
      assertStringIncludes(html, 'name="twitter:title"');
      assertStringIncludes(html, 'name="twitter:description"');
      assertStringIncludes(html, 'name="twitter:image"');
      assertStringIncludes(html, 'content="https://orw.karleo.net/screenshot.png"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include RSS feed link",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // RSS feed alternate link
      assertStringIncludes(html, 'rel="alternate"');
      assertStringIncludes(html, 'type="application/rss+xml"');
      assertStringIncludes(html, 'title="OpenRouter Model Changes"');
      assertStringIncludes(html, 'href="/rss"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include favicon and stylesheet",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // Favicon
      assertStringIncludes(html, 'rel="icon"');
      assertStringIncludes(html, 'type="image/svg+xml"');
      assertStringIncludes(html, 'href="/favicon.svg"');
      assertStringIncludes(html, 'sizes="32x32"');

      // Stylesheet
      assertStringIncludes(html, 'rel="stylesheet"');
      assertStringIncludes(html, 'href="/app.css"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include page title",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // Page title
      assertStringIncludes(html, "<title>OpenRouter API Watcher</title>");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should include content container",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/changes`);
      const html = await response.text();

      // Content container div
      assertStringIncludes(html, 'class="content-container"');
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "App layout should be consistent across all pages",
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

        // All pages should have the same basic structure
        assertStringIncludes(html, "<!DOCTYPE html>");
        assertStringIncludes(html, "<title>OpenRouter API Watcher</title>");
        assertStringIncludes(html, 'href="/app.css"');
        assertStringIncludes(html, 'href="/favicon.svg"');
        assertStringIncludes(html, 'class="content-container"');
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
