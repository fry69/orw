import { createDefine } from "@fresh/core";
import type { Lists, WatcherStatus } from "./lib/types.ts";

export interface State {
  commonData?: {
    status: WatcherStatus;
    lists: Lists;
  };
}

export const define = createDefine<State>();
