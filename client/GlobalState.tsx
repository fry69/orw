// src/GlobalState.tsx
import { createContext, useState } from "react";
import type { GlobalState } from "./client";

const defaultGlobalState: GlobalState = {
  status: {
    isValid: false,
    isDevelopment: false,
    apiLastCheck: "",
    apiLastCheckStatus: "",
    dbLastChange: "",
  },
  data: {
    models: [],
    removed: [],
    changes: [],
  },
  navBarDynamicElement: <></>,
  refreshTrigger: false,
  timerRefreshTrigger: false,
};

export const GlobalContext = createContext<{
  globalState: GlobalState;
  setGlobalState: React.Dispatch<React.SetStateAction<GlobalState>>;
}>({
  globalState: defaultGlobalState,
  setGlobalState: () => {},
});

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [globalState, setGlobalState] = useState<GlobalState>(defaultGlobalState);

  return (
    <GlobalContext.Provider value={{ globalState, setGlobalState }}>
      {children}
    </GlobalContext.Provider>
  );
};
