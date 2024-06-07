// GlobalState.tsx
import { createContext, useState } from "react";
import type { FC, ReactNode, Dispatch, SetStateAction } from "react";
import type { GlobalClient, GlobalError } from "./client";
import type { APIStatus, Lists } from "../shared/global";

/**
 * Interface defining the default values for the global context.
 */
interface ContextDefaults {
  Status: APIStatus;
  Lists: Lists;
  GlobalClient: GlobalClient;
  GlobalError: GlobalError;
}

/**
 * Object containing the default values for the global context.
 */
const defaults: ContextDefaults = {
  Status: {
    isValid: false,
    isDevelopment: false,
    apiLastCheck: "",
    apiLastCheckStatus: "",
    dbLastChange: "",
  },
  Lists: {
    models: [],
    removed: [],
    changes: [],
  },
  GlobalClient: {
    navBarDynamicElement: <></>,
    navBarDurations: {
      dbLastChange: "",
      apiLastCheck: "",
    },
  },
  GlobalError: {
    isError: false,
    preventClearing: false,
    message: "",
  },
};

/**
 * Interface defining the structure of the context type.
 * @typeParam T - The type of the state.
 */
export interface ContextType<T> {
  /** The current state. */
  state: T;
  /** Function to update the state. */
  setState: Dispatch<SetStateAction<T>>;
}

/**
 * Interface defining the structure of the global context type.
 */
export interface GlobalContextType {
  globalStatus: ContextType<APIStatus>;
  globalLists: ContextType<Lists>;
  globalClient: ContextType<GlobalClient>;
  globalError: {
    state: GlobalError;
    setState: (message?: string, preventClearing?: boolean) => void;
  };
}

/**
 * Object containing the default values for the global context.
 */
const contextDefaults: GlobalContextType = {
  globalStatus: { state: defaults.Status, setState: () => {} },
  globalLists: { state: defaults.Lists, setState: () => {} },
  globalClient: { state: defaults.GlobalClient, setState: () => {} },
  globalError: { state: defaults.GlobalError, setState: () => {} },
};

/**
 * Create a context for the global state.
 */
export const GlobalContext = createContext<GlobalContextType>(contextDefaults);

/**
 * GlobalProvider component creating GlobalContext.Provider and managing global state.
 * @param children - The children components to be wrapped by the GlobalContext.Provider.
 * @returns - The GlobalConext.Provider component including chilren.
 */
export const GlobalProvider: FC<{ children: ReactNode }> = ({
  children,
}: {
  children: ReactNode;
}): ReactNode => {
  const [globalStatus, setGlobalStatus] = useState<APIStatus>(defaults.Status);
  const [globalLists, setGlobalLists] = useState<Lists>(defaults.Lists);
  const [globalClient, setGlobalClient] = useState<GlobalClient>(defaults.GlobalClient);
  const [globalError, setGlobalError] = useState<GlobalError>(defaults.GlobalError);

  // Convenience function for setting a global error state.
  const setError = (message?: string, preventClearing: boolean = false) => {
    if (message) {
      console.error(message);
      setGlobalError({ isError: true, message, preventClearing });
    } else if (!message || message === "") {
      setGlobalError({ isError: false, message: "", preventClearing: false });
    }
  };

  const contextValue: GlobalContextType = {
    globalStatus: { state: globalStatus, setState: setGlobalStatus },
    globalLists: { state: globalLists, setState: setGlobalLists },
    globalClient: { state: globalClient, setState: setGlobalClient },
    globalError: { state: globalError, setState: setError },
  };

  return <GlobalContext.Provider value={contextValue}>{children}</GlobalContext.Provider>;
};
