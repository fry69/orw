import { useContext, useEffect, type FC, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import Error from "./Error";

/**
 * ErrorContainerProps interface.
 */
export interface ErrorContainerProps {
  /** The children components to be rendered inside the ErrorContainer. */
  children: ReactNode;
}

/**
 * ErrorContainer component that handles global errors and displays an Error component if there is an error.
 * @param props - The props object.
 * @returns - The ErrorContainer component.
 */
export const ErrorContainer: FC<ErrorContainerProps> = ({
  children,
}: ErrorContainerProps): ReactNode => {
  const { globalError } = useContext(GlobalContext);
  const location = useLocation();

  useEffect(() => {
    if (globalError.state.preventClearing) {
      // prevent clearing error (e.g. problems connecting to the API)
      return;
    }
    globalError.setState(); // clear out error on location change (e.g. soft error like wrong model ID)
  }, [location]);

  if (globalError.state.isError) {
    return <Error message={globalError.state.message}></Error>;
  } else {
    return <>{children}</>;
  }
};
