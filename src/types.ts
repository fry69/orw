export interface ModelDiffClient {
  id: string;
  type: string;
  changes: any[];
  timestamp: string;
}

export interface GlobalState {
  apiLastCheck: string;
  dbLastChange: string;
  navBarDynamicElement: React.ReactElement;
}