export interface GlobalClient {
  navBarDynamicElement: React.ReactElement;
  navBarDurations: {
    dbLastChange: string;
    apiLastCheck: string;
  };
}

export interface GlobalError {
  isError: boolean;
  preventClearing: boolean;
  message: string;
}
