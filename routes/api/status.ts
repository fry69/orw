// routes/api/status.ts - API status endpoint (Fresh 2)
import type { FreshContext } from "fresh";
import { getWatcher } from "../../lib/watcher-service.ts";
import { API_VERSION } from "../../shared/constants.ts";

export const handler = {
  GET: async (_ctx: FreshContext) => {
    try {
      const watcher = await getWatcher();

      const response_status = {
        status: {
          dbLastChange: watcher.getDBLastChange,
          apiLastCheck: watcher.getAPILastCheck,
          apiLastCheckStatus: watcher.getAPILastCheckStatus,
          isDevelopment: Deno.env.get("NODE_ENV") === "development" || false,
          isValid: true,
        },
        version: API_VERSION,
      };

      return Response.json(response_status);
    } catch (error) {
      console.error("API status error:", error);
      return Response.json(
        { error: "Failed to get status", version: API_VERSION },
        { status: 500 }
      );
    }
  },
};
