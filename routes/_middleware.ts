// routes/_middleware.ts - Load common data for all pages
import { define } from "../lib/app.ts";
import { getGlobalWatcher } from "../server/index.ts";

export default define.middleware(async (ctx) => {
  // Skip API routes and health check
  if (ctx.url.pathname.startsWith("/api/") || ctx.url.pathname === "/health") {
    return ctx.next();
  }

  try {
    // ✅ Load common data once for all routes
    const watcher = await getGlobalWatcher();
    const watcherStatus = watcher.watcherStatus;

    ctx.state.commonData = {
      status: {
        isDevelopment: Deno.env.get("NODE_ENV") === "development" || false,
        apiLastCheck: watcherStatus.apiLastCheck.toISOString(),
        apiLastCheckStatus: watcherStatus.apiLastCheckStatus,
        dbLastChange: watcherStatus.dbLastChange.toISOString(),
      },
      lists: watcher.allLists,
    };
  } catch (error) {
    console.error("Failed to load common data:", error);
    // Continue with empty data rather than failing
    ctx.state.commonData = {
      status: {
        isDevelopment: false,
        apiLastCheck: "",
        apiLastCheckStatus: "",
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
