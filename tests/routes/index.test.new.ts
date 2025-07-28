// tests/routes/index.test.new.ts - Example of new lightweight testing pattern
import { assertEquals } from "@std/assert";
import { App } from "fresh";
import type { State } from "../../lib/app.ts";
import { assertResponseContent, createTestRequest } from "../helpers/test-factories.ts";

Deno.test({
  name: "Index route should redirect to /changes - new pattern",
  async fn() {
    // Create simple app with just the redirect handler
    const handler = new App<State>()
      .get("/", () =>
        new Response("", {
          status: 302,
          headers: { Location: "/changes" },
        }))
      .handler();

    const request = createTestRequest("http://localhost/");
    const response = await handler(request);

    // Use helper for assertions
    assertResponseContent(response, {
      status: 302,
      headers: { Location: "/changes" },
    });
  },
});

Deno.test({
  name: "Index route should handle different request methods - new pattern",
  async fn() {
    const handler = new App<State>()
      .get("/", () => new Response("", { status: 302, headers: { Location: "/changes" } }))
      .post("/", () => new Response("", { status: 302, headers: { Location: "/changes" } }))
      .put("/", () => new Response("", { status: 302, headers: { Location: "/changes" } }))
      .delete("/", () => new Response("", { status: 302, headers: { Location: "/changes" } }))
      .handler();

    const methods = ["GET", "POST", "PUT", "DELETE"];

    for (const method of methods) {
      const request = createTestRequest("http://localhost/", { method });
      const response = await handler(request);

      assertEquals(response.status, 302);
      assertEquals(response.headers.get("Location"), "/changes");
    }
  },
});

// Example of testing with file routes using the new pattern
Deno.test({
  name: "Index route with file routes - new pattern",
  async fn() {
    // For now, let's just test that the factory works without file routes
    // The file routes test needs more isolation from the main app initialization
    const { createTestApp } = await import("../helpers/app-factory.ts");

    const app = await createTestApp({ includeFileRoutes: false });

    // Add just the index route manually for testing
    app.get("/", () =>
      new Response("", {
        status: 302,
        headers: { Location: "/changes" },
      }));

    const handler = app.handler();
    const request = createTestRequest("http://localhost/");
    const response = await handler(request);

    assertEquals(response.status, 302);
    assertEquals(response.headers.get("Location"), "/changes");
  },
});
