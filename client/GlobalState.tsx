// src/GlobalState.tsx
import { createContext, useState } from "react";
import type { FC, ReactNode, Dispatch, SetStateAction } from "react";
import type { GlobalClient, GlobalError } from "./client";
import type { APIStatus, Lists } from "../global";

const defaultGlobalStatus: APIStatus = {
  isValid: false,
  isDevelopment: false,
  apiLastCheck: "",
  apiLastCheckStatus: "",
  dbLastChange: "",
};

const defaultGlobalLists: Lists = {
  models: [],
  removed: [],
  changes: [],
};

const defaultGlobalClient: GlobalClient = {
  navBarDynamicElement: <></>,
  navBarDurations: {
    dbLastChange: "",
    apiLastCheck: "",
  },
};

const defaultGlobalError: GlobalError = {
  isError: false,
  preventClearing: false,
  message: "",
};

export const GlobalContext = createContext<{
  globalStatus: APIStatus;
  setGlobalStatus: Dispatch<SetStateAction<APIStatus>>;
  globalLists: Lists;
  setGlobalLists: Dispatch<SetStateAction<Lists>>;
  globalClient: GlobalClient;
  setGlobalClient: Dispatch<SetStateAction<GlobalClient>>;
  globalError: GlobalError;
  setError: (message?: string, preventClearing?: boolean) => void;
}>({
  globalStatus: defaultGlobalStatus,
  setGlobalStatus: () => {},
  globalLists: defaultGlobalLists,
  setGlobalLists: () => {},
  globalClient: defaultGlobalClient,
  setGlobalClient: () => {},
  globalError: defaultGlobalError,
  setError: (message?: string, preventClearing?: boolean) => {},
});

export const GlobalProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [globalStatus, setGlobalStatus] = useState<APIStatus>(defaultGlobalStatus);
  const [globalLists, setGlobalLists] = useState<Lists>(defaultGlobalLists);
  const [globalClient, setGlobalClient] = useState<GlobalClient>(defaultGlobalClient);
  const [globalError, setGlobalError] = useState<GlobalError>(defaultGlobalError);

  const setError = (message?: string, preventClearing: boolean = false) => {
    if (message) {
      console.error(message);
      setGlobalError({ isError: true, message, preventClearing });
    } else if (!message || message === "") {
      setGlobalError({ isError: false, message: "", preventClearing: false });
    }
  };

  return (
    <GlobalContext.Provider
      value={{
        globalStatus,
        setGlobalStatus,
        globalLists,
        setGlobalLists,
        globalClient,
        setGlobalClient,
        globalError,
        setError,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};
