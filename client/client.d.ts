import type { ReactElement } from "react";

export interface GlobalClient {
  navBarDynamicElement: ReactElement;
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
