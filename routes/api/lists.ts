// routes/api/lists.ts - API lists endpoint (Fresh 2)
import { getGlobalWatcher } from "../../server/app.ts";
import { API_VERSION } from "../../lib/constants.ts";

export async function handler(_req: Request): Promise<Response> {
  try {
    const watcher = await getGlobalWatcher();
    const lists = watcher.getLists;

    return Response.json({
      lists: lists,
      version: API_VERSION,
    });
  } catch (error) {
    console.error("API lists error:", error);
    return Response.json(
      { error: "Failed to get lists", version: API_VERSION },
      { status: 500 },
    );
  }
}
