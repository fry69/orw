// routes/_middleware.ts - Load common data for all pages
import { define, getAppConfig } from "../utils.ts";
import { getWatcher } from "../server/index.ts";
import { WATCHER_INTERVAL_MS } from "../lib/constants.ts";

/**
 * Calculate cache max-age based on when the next API check will happen.
 * This provides intelligent cache timing: browsers cache until just before new changes could appear.
 */
function calculateCacheMaxAge(watcherStatus: { apiLastCheck: Date }): number {
  const timeSinceLastCheck = Date.now() - watcherStatus.apiLastCheck.getTime();
  const timeUntilNextCheck = WATCHER_INTERVAL_MS - timeSinceLastCheck;

  // Ensure we have at least 60 seconds cache time, but not more than 1 hour
  const maxAgeSeconds = Math.max(60, Math.min(Math.floor(timeUntilNextCheck / 1000), 3600));

  return maxAgeSeconds;
}

export default define.middleware(async (ctx) => {
  // Skip API routes and health check
  if (ctx.url.pathname.startsWith("/api/") || ctx.url.pathname === "/health") {
    return ctx.next();
  }

  // ✅ Load configuration and common data once for all routes
  const config = getAppConfig();
  const watcher = await getWatcher();
  const watcherStatus = watcher.watcherStatus;

  ctx.state.commonData = {
    config,
    status: {
      isDevelopment: Deno.env.get("NODE_ENV") === "development" || false,
      apiLastCheck: watcherStatus.apiLastCheck.toISOString(),
      apiLastCheckStatus: watcherStatus.apiLastCheckStatus,
      dbLastChange: watcherStatus.dbLastChange.toISOString(),
    },
    lists: watcher.allLists,
    pathname: ctx.url.pathname,
  };

  // ✅ Add intelligent caching headers - simpler approach without ETag complexity
  const response = await ctx.next();

  // Only add cache headers for successful HTML responses
  if (response.status === 200 && response.headers.get("content-type")?.includes("text/html")) {
    const cacheMaxAge = calculateCacheMaxAge(watcherStatus);
    response.headers.set("Cache-Control", `public, max-age=${cacheMaxAge}`);
    // Skip ETag for now - the auto-refresh handles data freshness
  }

  return response;
});
