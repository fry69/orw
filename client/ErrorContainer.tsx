import { useContext, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import Error from "./Error";

export const ErrorContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { globalError, setError } = useContext(GlobalContext);
  const location = useLocation();

  useEffect(() => {
    setError();
  }, [location]);

  if (globalError.isError) {
    return <Error message={globalError.message}></Error>;
  } else {
    return <>{children}</>;
  }
};
