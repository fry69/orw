import type { ServerStatus } from "../global";

export interface GlobalState {
  status: ServerStatus;
  data: {
    models: Model[];
    removed: Model[];
    changes: ModelDiffClient[];
  };
  navBarDynamicElement: React.ReactElement;
  refreshTrigger: boolean;
  timerRefreshTrigger: boolean;
}

export interface ModelDiffClient {
  id: string;
  type: string;
  changes?: any[];
  model?: any;
  timestamp: string;
}
