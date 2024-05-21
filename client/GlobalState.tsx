// src/GlobalState.tsx
import { createContext, useState } from "react";
import type { GlobalClient, GlobalError } from "./client";
import type { ServerStatus, ServerData } from "../global";

const defaultGlobalStatus: ServerStatus = {
  isValid: false,
  isDevelopment: false,
  apiLastCheck: "",
  apiLastCheckStatus: "",
  dbLastChange: "",
};

const defaultGlobalData: ServerData = {
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
  globalStatus: ServerStatus;
  setGlobalStatus: React.Dispatch<React.SetStateAction<ServerStatus>>;
  globalData: ServerData;
  setGlobalData: React.Dispatch<React.SetStateAction<ServerData>>;
  globalClient: GlobalClient;
  setGlobalClient: React.Dispatch<React.SetStateAction<GlobalClient>>;
  globalError: GlobalError;
  setError: (message?: string, preventClearing?: boolean) => void;
}>({
  globalStatus: defaultGlobalStatus,
  setGlobalStatus: () => {},
  globalData: defaultGlobalData,
  setGlobalData: () => {},
  globalClient: defaultGlobalClient,
  setGlobalClient: () => {},
  globalError: defaultGlobalError,
  setError: (message?: string, preventClearing?: boolean) => {},
});

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalStatus, setGlobalStatus] = useState<ServerStatus>(defaultGlobalStatus);
  const [globalData, setGlobalData] = useState<ServerData>(defaultGlobalData);
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
        globalData,
        setGlobalData,
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
