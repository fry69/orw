import { FC, ReactNode } from "react";

/**
 * Props for the ModelName component.
 */
export interface ModelNameProps {
  /** The name of the model. */
  name: string;
  /** Indicates whether the model has been removed. */
  removed: boolean;
}

/**
 * ModelName component displays the name of the model.
 * If the model is removed, it displays the name with a red "(removed)" text.
 * @param props - The props for the ModelName component.
 * @returns - The name of the model with a red "(removed)" text if the model is removed.
 */
export const ModelName: FC<ModelNameProps> = ({ name, removed }: ModelNameProps): ReactNode => {
  if (removed) {
    return (
      <>
        {name + " "}
        <b style={{ color: "red" }}>(removed)</b>
      </>
    );
  }
  return <>{name}</>;
};
