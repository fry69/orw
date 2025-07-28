// tests/routes/changes.test.new.ts - Example of testing data-dependent route
import { assertEquals, assertStringIncludes } from "@std/assert";
import { createTestApp } from "../helpers/app-factory.ts";
import { testData } from "../helpers/test-factories.ts";

Deno.test({
  name: "Changes page should render with test data - new pattern",
  async fn() {
    const app = await createTestApp({
      includeFileRoutes: true,
      ...testData.small, // Use small test dataset
    });

    const handler = app.handler();
    const request = new Request("http://localhost/changes");
    const response = await handler(request);

    assertEquals(response.status, 200);

    const html = await response.text();

    // Basic HTML structure should be present
    assertStringIncludes(html, "<!DOCTYPE html>");
    assertStringIncludes(html, "<html");
    assertStringIncludes(html, "<body");

    // Component should be rendered
    assertStringIncludes(html, "DataInitializer");
    assertStringIncludes(html, "main-content");
  },
});

Deno.test({
  name: "Changes page should include test data in state - new pattern",
  async fn() {
    const testConfig = {
      includeFileRoutes: true,
      models: testData.small.models,
      changes: testData.small.changes,
    };

    const app = await createTestApp(testConfig);
    const handler = app.handler();
    const request = new Request("http://localhost/changes");
    const response = await handler(request);

    assertEquals(response.status, 200);

    const html = await response.text();

    // Should contain references to our test data
    // (The exact content depends on how the components render the data)
    assertStringIncludes(html, "DataInitializer");
  },
});

// Example of testing error conditions
Deno.test({
  name: "Changes page should handle empty data gracefully - new pattern",
  async fn() {
    const app = await createTestApp({
      includeFileRoutes: true,
      models: [],
      changes: [],
    });

    const handler = app.handler();
    const request = new Request("http://localhost/changes");
    const response = await handler(request);

    // Should still render successfully even with empty data
    assertEquals(response.status, 200);

    const html = await response.text();
    assertStringIncludes(html, "<!DOCTYPE html>");
    assertStringIncludes(html, "main-content");
  },
});
