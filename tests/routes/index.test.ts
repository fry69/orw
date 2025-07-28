// tests/routes/index.test.ts - Tests for index route (redirect functionality)
import { assertEquals } from "@std/assert";

Deno.test({
  name: "Index route should redirect to /changes",
  async fn() {
    // Import the handler directly for testing
    const module = await import("../../routes/index.tsx");
    const request = new Request("http://localhost/");

    const response = module.handler(request);

    // Should be a redirect response
    assertEquals(response.status, 302);
    assertEquals(response.headers.get("Location"), "/changes");
  },
});

Deno.test({
  name: "Index route should handle different request methods",
  async fn() {
    const module = await import("../../routes/index.tsx");

    // Test different HTTP methods
    const methods = ["GET", "POST", "PUT", "DELETE"];

    for (const method of methods) {
      const request = new Request("http://localhost/", { method });
      const response = module.handler(request);

      // All should redirect regardless of method
      assertEquals(response.status, 302);
      assertEquals(response.headers.get("Location"), "/changes");
    }
  },
});

Deno.test({
  name: "Index route should handle different URLs",
  async fn() {
    const module = await import("../../routes/index.tsx");

    // Test different URLs (the handler doesn't care about the URL, but we test it anyway)
    const urls = [
      "http://localhost/",
      "http://localhost/index",
      "http://example.com/",
      "https://orw.karleo.net/",
    ];

    for (const url of urls) {
      const request = new Request(url);
      const response = module.handler(request);

      assertEquals(response.status, 302);
      assertEquals(response.headers.get("Location"), "/changes");
    }
  },
});
