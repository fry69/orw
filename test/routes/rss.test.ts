// test/routes/rss.test.ts - Tests for RSS feed endpoint
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestContext } from "../helpers/test-setup.ts";

Deno.test("RSS feed should return valid XML", async () => {
  const { cleanup } = await createTestContext();

  try {
    // Make request to RSS endpoint
    const response = await fetch("http://localhost:8000/rss");
    const rssXML = await response.text();

    // Check response headers
    assertEquals(response.status, 200);
    assertEquals(response.headers.get("Content-Type"), "application/rss+xml; charset=utf-8");

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
    await cleanup();
  }
});

Deno.test("RSS feed should include recent changes", async () => {
  const { cleanup } = await createTestContext();

  try {
    const response = await fetch("http://localhost:8000/rss");
    const rssXML = await response.text();

    // Should contain RSS items for changes
    assertStringIncludes(rssXML, "<item>");
    assertStringIncludes(rssXML, "<title>");
    assertStringIncludes(rssXML, "<description>");
    assertStringIncludes(rssXML, "<pubDate>");
    assertStringIncludes(rssXML, "<guid");
  } finally {
    await cleanup();
  }
});

Deno.test("RSS feed should handle added models correctly", async () => {
  const { cleanup } = await createTestContext();

  try {
    const response = await fetch("http://localhost:8000/rss");
    const rssXML = await response.text();

    // Look for "added" in the title or description
    if (rssXML.includes("added")) {
      assertStringIncludes(rssXML, "New model added:");
      assertStringIncludes(rssXML, "<pre><code>");
    }
  } finally {
    await cleanup();
  }
});

Deno.test("RSS feed should handle changed models correctly", async () => {
  const { cleanup } = await createTestContext();

  try {
    const response = await fetch("http://localhost:8000/rss");
    const rssXML = await response.text();

    // Look for "updated" in the title
    if (rssXML.includes("updated")) {
      assertStringIncludes(rssXML, "Model updated:");
      assertStringIncludes(rssXML, "OLD:");
      assertStringIncludes(rssXML, "NEW:");
    }
  } finally {
    await cleanup();
  }
});

Deno.test("RSS feed should set dynamic cache headers based on next API check", async () => {
  const { cleanup } = await createTestContext();

  try {
    const response = await fetch("http://localhost:8000/rss");

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
    await cleanup();
  }
});

Deno.test("RSS feed should limit to 50 items maximum", async () => {
  const { cleanup } = await createTestContext();

  try {
    const response = await fetch("http://localhost:8000/rss");
    const rssXML = await response.text();

    // Count <item> tags
    const itemMatches = rssXML.match(/<item>/g);
    const itemCount = itemMatches ? itemMatches.length : 0;

    // Should not exceed 50 items
    assertEquals(
      itemCount <= 50,
      true,
      `RSS feed should have at most 50 items, but found ${itemCount}`,
    );
  } finally {
    await cleanup();
  }
});
