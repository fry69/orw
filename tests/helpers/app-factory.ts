// tests/helpers/app-factory.ts - Fresh app factory for testing
import { App } from "fresh";
import { Builder } from "fresh/dev";
import type { State } from "../../lib/app.ts";
import { define } from "../../lib/app.ts";
import { createMockWatcherData, type MockWatcherConfig } from "./test-factories.ts";

// Build snapshot once for performance
let builderSnapshot: ((app: App<State>) => void) | null = null;

export async function getBuilderSnapshot() {
  if (!builderSnapshot) {
    const builder = new Builder();
    builderSnapshot = await builder.build({ snapshot: "memory" });
  }
  return builderSnapshot;
}

/**
 * Configuration for test app creation
 */
export interface TestAppConfig extends MockWatcherConfig {
  includeFileRoutes?: boolean;
}

/**
 * Create a Fresh app instance for testing with optional file routes
 */
export async function createTestApp(config: TestAppConfig = {}): Promise<App<State>> {
  const mockData = createMockWatcherData(config);
  const app = new App<State>();

  // Add mock middleware that mimics _middleware.ts behavior
  const mockMiddleware = define.middleware((ctx) => {
    // Skip API routes
    if (ctx.url.pathname.startsWith("/api/")) {
      return ctx.next();
    }

    ctx.state.commonData = {
      status: mockData.status,
      lists: {
        models: mockData.models,
        removed: mockData.changes.filter((c) => c.type === "removed").map((c) => c.model!),
        changes: mockData.changes,
      },
    };

    return ctx.next();
  });

  app.use(mockMiddleware);

  // Add file system routes if requested
  if (config.includeFileRoutes) {
    app.fsRoutes();
    const applySnapshot = await getBuilderSnapshot();
    applySnapshot(app);
  }

  return app;
}

/**
 * Create a lightweight app for testing simple handlers
 */
export function createSimpleApp(): App<State> {
  return new App<State>();
}

/**
 * Create an app with specific routes for testing
 */
export function createAppWithRoutes(
  routes: { method: string; path: string; handler: (ctx: unknown) => Response }[],
): App<State> {
  const app = new App<State>();

  for (const route of routes) {
    switch (route.method.toUpperCase()) {
      case "GET":
        app.get(route.path, route.handler);
        break;
      case "POST":
        app.post(route.path, route.handler);
        break;
      case "PUT":
        app.put(route.path, route.handler);
        break;
      case "DELETE":
        app.delete(route.path, route.handler);
        break;
      default:
        throw new Error(`Unsupported method: ${route.method}`);
    }
  }

  return app;
}
