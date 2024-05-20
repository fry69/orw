import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import Error from "./Error";

export const ErrorContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { globalError, setError } = useContext(GlobalContext);
  const location = useLocation();

  useEffect(() => {
    if (globalError.preventClearing) {
      // prevent clearing error (e.g. problems connecting to the API)
      return;
    }
    setError(); // clear out error on location change (e.g. soft error like wrong model ID)
  }, [location]);

  if (globalError.isError) {
    return <Error message={globalError.message}></Error>;
  } else {
    return <>{children}</>;
  }
};
