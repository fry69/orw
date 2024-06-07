import { FC, ReactNode } from "react";

/**
 * DelContainerProps interface defines the properties for the DelContainer component.
 */
export interface DelContainerProps {
  /** The child elements to be wrapped by the DelContainer component. */
  children: ReactNode;
  /** A flag indicating whether the model is removed or not. */
  removed: boolean;
}

/**
 * DelContainer component is a wrapper that applies a strikethrough effect to its children if the model is removed.
 * @param props - The properties for the DelContainer component.
 * @returns - The wrapped children elements with a strikethrough effect if the model is removed.
 */
export const DelContainer: FC<DelContainerProps> = ({
  children,
  removed,
}: DelContainerProps): ReactNode => {
  if (removed) {
    return (
      <>
        <del>{children}</del>
      </>
    );
  }
  return children;
};
