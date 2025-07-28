// tests/routes/middleware.test.new.ts - Example of lightweight middleware testing
import { assertEquals } from "@std/assert";
import { App } from "fresh";
import type { State } from "../../lib/app.ts";
import { define } from "../../lib/app.ts";
import { testData } from "../helpers/test-factories.ts";

Deno.test({
  name: "Middleware should load common data for regular routes - new pattern",
  async fn() {
    // Create middleware similar to routes/_middleware.ts but with test data
    const testMiddleware = define.middleware((ctx) => {
      // Skip API routes
      if (ctx.url.pathname.startsWith("/api/")) {
        return ctx.next();
      }

      // Simulate loading data (normally from database)
      ctx.state.commonData = {
        status: testData.small.status,
        lists: {
          models: testData.small.models,
          removed: testData.small.changes.filter((c) => c.type === "removed").map((c) => c.model!),
          changes: testData.small.changes,
        },
      };

      return ctx.next();
    });

    // Test that middleware sets state correctly
    const handler = new App<State>()
      .use(testMiddleware)
      .get("/test", (ctx) => {
        // Return the state as JSON to verify middleware worked
        return new Response(JSON.stringify(ctx.state.commonData), {
          headers: { "content-type": "application/json" },
        });
      })
      .handler();

    const response = await handler(new Request("http://localhost/test"));
    assertEquals(response.status, 200);

    const data = await response.json();

    // Verify middleware loaded the expected data
    assertEquals(data.status.apiLastCheckStatus, "success");
    assertEquals(data.lists.models.length, testData.small.models.length);
    assertEquals(data.lists.changes.length, testData.small.changes.length);
  },
});

Deno.test({
  name: "Middleware should skip API routes - new pattern",
  async fn() {
    const testMiddleware = define.middleware((ctx) => {
      if (ctx.url.pathname.startsWith("/api/")) {
        // Don't set commonData for API routes
        return ctx.next();
      }

      ctx.state.commonData = {
        status: testData.small.status,
        lists: {
          models: testData.small.models,
          removed: testData.small.changes.filter((c) => c.type === "removed").map((c) => c.model!),
          changes: testData.small.changes,
        },
      };

      return ctx.next();
    });

    const handler = new App<State>()
      .use(testMiddleware)
      .get("/api/test", (ctx) => {
        // API route should not have commonData
        const hasCommonData = ctx.state.commonData !== undefined;
        return new Response(JSON.stringify({ hasCommonData }), {
          headers: { "content-type": "application/json" },
        });
      })
      .get("/regular", (ctx) => {
        // Regular route should have commonData
        const hasCommonData = ctx.state.commonData !== undefined;
        return new Response(JSON.stringify({ hasCommonData }), {
          headers: { "content-type": "application/json" },
        });
      })
      .handler();

    // Test API route
    const apiResponse = await handler(new Request("http://localhost/api/test"));
    const apiData = await apiResponse.json();
    assertEquals(apiData.hasCommonData, false);

    // Test regular route
    const regularResponse = await handler(new Request("http://localhost/regular"));
    const regularData = await regularResponse.json();
    assertEquals(regularData.hasCommonData, true);
  },
});

Deno.test({
  name: "Middleware should handle errors gracefully - new pattern",
  async fn() {
    // Simulate middleware that might fail to load data
    const faultyMiddleware = define.middleware((ctx) => {
      if (ctx.url.pathname.startsWith("/api/")) {
        return ctx.next();
      }

      try {
        // Simulate database error
        throw new Error("Database connection failed");
      } catch (error) {
        console.error("Failed to load common data:", error);
        // Continue with empty data rather than failing
        ctx.state.commonData = {
          status: {
            isDevelopment: false,
            apiLastCheck: "",
            apiLastCheckStatus: "error",
            dbLastChange: "",
          },
          lists: {
            models: [],
            removed: [],
            changes: [],
          },
        };
      }

      return ctx.next();
    });

    const handler = new App<State>()
      .use(faultyMiddleware)
      .get("/test", (ctx) => {
        return new Response(JSON.stringify(ctx.state.commonData), {
          headers: { "content-type": "application/json" },
        });
      })
      .handler();

    const response = await handler(new Request("http://localhost/test"));
    assertEquals(response.status, 200);

    const data = await response.json();

    // Should have fallback data structure
    assertEquals(data.status.apiLastCheckStatus, "error");
    assertEquals(data.lists.models.length, 0);
    assertEquals(data.lists.changes.length, 0);
  },
});
