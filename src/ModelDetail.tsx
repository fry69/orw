import { useContext, useEffect, useState } from "react";
import type { FC, ReactNode } from "react";
import type { Model, ModelDiff } from "../shared/global";
import { GlobalContext } from "./GlobalState";
import { Changes } from "./Changes";
import { Price } from "./Price";
import { ModelName } from "./ModelName";
import { DelContainer } from "./DelContainer";

/**
 * ModelDetail component displays the details of a specific model.
 * It fetches the model data from the global context and displays
 * its price, name, context length, description, and changes.
 * If the model is removed, it displays the details with a strikethrough.
 * @returns The ModelDetail component.
 */
export const ModelDetail: FC = (): ReactNode => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiff[]>([]);
  const [removed, setRemoved] = useState<boolean>(false);
  const { globalStatus, globalLists, globalClient, globalError } = useContext(GlobalContext);

  useEffect(() => {
    globalClient.setState((prevState) => ({
      ...prevState,
      navBarDynamicElement: (
        <>
          <span className="dynamic-element"></span>
        </>
      ),
    }));
  }, []);

  useEffect(() => {
    if (!globalStatus.state.isValid) {
      // No point in doing anything, if the data is not valid.
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (!id) {
      globalError.setState("No model ID provided.");
      return;
    }
    let foundModel: Model | undefined = globalLists.state.models.find(
      (obj: Model) => obj.id === id
    );
    if (!foundModel) {
      const removedModel: Model | undefined = globalLists.state.removed.find(
        (obj: Model) => obj.id === id
      );
      if (removedModel) {
        setRemoved(true);
        foundModel = removedModel;
      } else {
        globalError.setState("Unknown model ID.");
        return;
      }
    }
    setModel(foundModel);
    const foundChanges: ModelDiff[] = globalLists.state.changes.filter((obj) => obj.id === id);
    setChanges(foundChanges);
  }, [globalLists.state.models, globalLists.state.removed, globalStatus.state.isValid]);

  if (!model) {
    return <></>;
  }

  // Create a new object that hides the already shown 'description' property
  const modelDetails: Model = { ...model };
  modelDetails["description"] = "[...]";

  return (
    <div className="model-details">
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          <DelContainer removed={removed}>
            <Price model={model} />
          </DelContainer>
        </div>
        <div>
          <h2 className="model-details-model-name">
            <ModelName name={model.name} removed={removed} />
          </h2>
          <DelContainer removed={removed}>
            <h4>{model.id}</h4>
          </DelContainer>
        </div>
        <div>
          <h3>Context Length</h3>
          <DelContainer removed={removed}>
            <p style={{ fontSize: "x-large", textAlign: "center" }}>
              {model.context_length.toLocaleString()}
            </p>
          </DelContainer>
        </div>
      </div>
      <h3>Description</h3>
      <pre>{model.description}</pre>
      <h3>Model Details</h3>
      <code>
        <pre>{JSON.stringify(modelDetails, null, 4)}</pre>
      </code>
      <Changes changes={changes} />
    </div>
  );
};
