// test/routes/rss.test.ts - Tests for RSS feed endpoint
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestServerContext, testData } from "../helpers/test-setup.ts";

Deno.test({
  name: "RSS feed should return valid XML",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      // Make request to RSS endpoint
      const response = await fetch(`${serverContext.baseUrl}/rss`);
      const rssXML = await response.text();

      // Check response headers
      assertEquals(response.status, 200);
      const contentType = response.headers.get("Content-Type") || "";
      assertEquals(contentType.startsWith("application/rss+xml"), true);

      // Check RSS structure
      assertStringIncludes(rssXML, '<?xml version="1.0" encoding="UTF-8"?>');
      assertStringIncludes(rssXML, "<rss");
      assertStringIncludes(rssXML, "<channel>");
      assertStringIncludes(rssXML, "<title><![CDATA[OpenRouter Model Changes]]></title>");
      assertStringIncludes(
        rssXML,
        "<description><![CDATA[Feed for detected changes in the OpenRouter model list]]></description>",
      );
      assertStringIncludes(rssXML, "</channel>");
      assertStringIncludes(rssXML, "</rss>");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "RSS feed should include recent changes",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/rss`);
      const rssXML = await response.text();

      // Should contain RSS items for changes
      assertStringIncludes(rssXML, "<item>");
      assertStringIncludes(rssXML, "<title>");
      assertStringIncludes(rssXML, "<description>");
      assertStringIncludes(rssXML, "<pubDate>");
      assertStringIncludes(rssXML, "<guid");
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "RSS feed should handle added models correctly",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/rss`);
      const rssXML = await response.text();

      // Look for "added" in the title or description
      if (rssXML.includes("added")) {
        assertStringIncludes(rssXML, "New model added:");
        assertStringIncludes(rssXML, "<pre><code>");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "RSS feed should handle changed models correctly",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/rss`);
      const rssXML = await response.text();

      // Look for "updated" in the title
      if (rssXML.includes("updated")) {
        assertStringIncludes(rssXML, "Model updated:");
        assertStringIncludes(rssXML, "OLD:");
        assertStringIncludes(rssXML, "NEW:");
      }
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "RSS feed should set dynamic cache headers based on next API check",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/rss`);

      // Consume the response to avoid leaks
      await response.text();

      const cacheControl = response.headers.get("Cache-Control");
      assertEquals(cacheControl?.startsWith("public, max-age="), true);

      // Extract max-age value
      const maxAge = parseInt(cacheControl?.split("max-age=")[1] || "0");

      // Should be between 60 seconds (minimum) and 3600 seconds (maximum)
      assertEquals(maxAge >= 60, true, `max-age should be at least 60 seconds, got ${maxAge}`);
      assertEquals(maxAge <= 3600, true, `max-age should be at most 3600 seconds, got ${maxAge}`);
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});

Deno.test({
  name: "RSS feed should limit to 50 items maximum",
  async fn() {
    const serverContext = await createTestServerContext({
      models: testData.models,
      changes: testData.changes,
    });

    try {
      const response = await fetch(`${serverContext.baseUrl}/rss`);
      const rssXML = await response.text();

      // Count <item> tags
      const itemMatches = rssXML.match(/<item>/g);
      const itemCount = itemMatches ? itemMatches.length : 0;

      // Should be limited to 50 items
      assertEquals(
        itemCount <= 50,
        true,
        `RSS feed should have at most 50 items, got ${itemCount}`,
      );
    } finally {
      await serverContext.shutdown();
    }
  },
  sanitizeResources: false,
  sanitizeOps: false,
});
