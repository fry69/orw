import type { ServerData, ServerStatus } from "../global";

export interface GlobalClient {
  navBarDynamicElement: React.ReactElement;
  navBarDurations: {
    dbLastChange: string;
    apiLastCheck: string;
  }
}

export interface GlobalError {
  isError: boolean;
  preventClearing: boolean;
  message: string;
}

export interface ServerDataClient {
  models: Model[];
  removed: Model[];
  changes: ModelDiffClient[];
}

export interface APIResponseClient {
  version: number;
  status?: ServerStatus;
  data?: ServerDataClient;
}

export interface ModelDiffClient {
  id: string;
  type: string;
  changes?: any[];
  model?: any;
  timestamp: string;
}
