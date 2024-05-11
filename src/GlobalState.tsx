// src/GlobalState.tsx
import { createContext, useState } from "react";
import type { GlobalState } from "./types";

const defaultGlobalState: GlobalState = {
  status: {
    isDevelopment: false,
    apiLastCheck: "",
    dbLastChange: "",
    dbModelCount: 0,
    dbChangesCount: 0,
    dbRemovedModelCount: 0,
  },
  navBarDynamicElement: <></>,
};

export const GlobalContext = createContext<{
  globalState: GlobalState;
  setGlobalState: React.Dispatch<React.SetStateAction<GlobalState>>;
}>({
  globalState: defaultGlobalState,
  setGlobalState: () => {},
});

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [globalState, setGlobalState] =
    useState<GlobalState>(defaultGlobalState);
  return (
    <GlobalContext.Provider value={{ globalState, setGlobalState }}>
      {children}
    </GlobalContext.Provider>
  );
};
