import type { ServerStatus } from "../global";

export interface GlobalState {
  status: ServerStatus;
  navBarDynamicElement: React.ReactElement;
  refreshTrigger: boolean;
}

export interface ModelDiffClient {
  id: string;
  type: string;
  changes?: any[];
  model?: any;
  timestamp: string;
}
