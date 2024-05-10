export interface ModelDiffClient {
  id: string;
  type: string;
  changes?: any[];
  model?: any;
  timestamp: string;
}

export interface StatusClient {
  apiLastCheck: string;
  dbLastChange: string;
  dbModelCount: number;
  dbChangesCount: number;
}


export interface GlobalState {
  status: StatusClient;
  navBarDynamicElement: React.ReactElement;
}