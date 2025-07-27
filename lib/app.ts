import { createDefine } from "fresh";
import type { Lists, WatcherStatus } from "../types/global.ts";

export interface State {
  commonData?: {
    status: WatcherStatus;
    lists: Lists;
  };
}

export const define = createDefine<State>();
