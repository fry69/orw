// src/GlobalState.tsx
import { createContext, useState } from "react";
import type { GlobalState } from "./types";

export const GlobalContext = createContext<{
  globalState: GlobalState;
  setGlobalState: React.Dispatch<React.SetStateAction<GlobalState>>;
}>({
  globalState: {
    apiLastCheck: "",
    dbLastChange: "",
    navBarDynamicElement: <></>,
  },
  setGlobalState: () => {},
});

export const GlobalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [globalState, setGlobalState] = useState<GlobalState>({
    apiLastCheck: "",
    dbLastChange: "",
    navBarDynamicElement: <></>,
  });
  return (
    <GlobalContext.Provider value={{ globalState, setGlobalState }}>
      {children}
    </GlobalContext.Provider>
  );
};
