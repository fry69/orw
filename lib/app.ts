import { createDefine } from "fresh";
import type { APIStatus, Lists } from "../types/global.ts";

export interface State {
  commonData?: {
    status: APIStatus;
    lists: Lists;
  };
}

export const define = createDefine<State>();
