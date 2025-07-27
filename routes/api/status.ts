// routes/api/status.ts - API status endpoint (Fresh 2)
import { getGlobalWatcher } from "../../server/index.ts";
import { API_VERSION } from "../../lib/constants.ts";

export async function handler(_req: Request): Promise<Response> {
  try {
    const watcher = await getGlobalWatcher();

    const response_status = {
      status: {
        dbLastChange: watcher.watcherStatus.dbLastChange,
        apiLastCheck: watcher.watcherStatus.apiLastCheck,
        apiLastCheckStatus: watcher.watcherStatus.apiLastCheckStatus,
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
      { status: 500 },
    );
  }
}
