// routes/api/lists.ts - API lists endpoint (Fresh 2)
import type { FreshContext } from "fresh";
import { getWatcher } from "../../lib/watcher-service.ts";
import { API_VERSION } from "../../shared/constants.ts";

export const handler = {
  GET: async (_ctx: FreshContext) => {
    try {
      const watcher = await getWatcher();
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
  },
};
