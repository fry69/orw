// routes/api/lists.ts - API lists endpoint (Fresh 2)
import type { Context } from "fresh";
import type { State } from "../../utils.ts";
import { getGlobalWatcher } from "../../main.ts";
import { API_VERSION } from "../../shared/constants.ts";

export const handler = {
  GET: async (_ctx: Context<State>) => {
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
  },
};
