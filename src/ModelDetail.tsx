import { useContext, useEffect, useState } from "react";
import type { Model, ModelDiff } from "../watch-or";
import { DynamicElementContext } from "./App";

export const ModelDetail: React.FC = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiff[]>([]);
  const { setDynamicElement } = useContext(DynamicElementContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      fetch(`/api/model?id=${id}`)
        .then((res) => res.json())
        .then(({ model, changes }) => {
          setModel(model);
          setChanges(changes);
        });
    }
  }, []);

  if (!model) {
    return <div>Loading...</div>;
  }

  setDynamicElement(<div className="model-id"> Model ID: {model?.id} </div>);

  // Create a new object that hides the already shown 'description' property
  const modelDetails: any = { ...model };
  modelDetails["description"] = "[...]";

  const calcCost = (floatString: string) => {
    const cost = Math.round(parseFloat(floatString) * 1000000 * 100) / 100;
    return cost > 0 ? cost : 0;
  };

  return (
    <div className="model-details">
      <h2>{model.name}</h2>
      <h3>Description</h3>
      <pre>{model.description}</pre>
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          <p style={{ fontSize: "large" }}>
            Input: <b>$ {calcCost(model.pricing.prompt)}</b> per million tokens
            <br />
            Output: <b>$ {calcCost(model.pricing.completion)}</b> per million
            tokens
          </p>
        </div>
        <div>
          <h3>Context Length</h3>
          <p style={{ fontSize: "x-large", textAlign: "center" }}>
            {model.context_length}
          </p>
        </div>
      </div>
      <h3>Model Details</h3>
      <pre>{JSON.stringify(modelDetails, null, 4)}</pre>
      <h3>Changes</h3>
      {changes.map((change, index) => (
        <div key={index} className="change-entry">
          <p>Timestamp: <b>{change.timestamp.toLocaleString()}</b></p>
          {Object.entries(change.changes).map(
            ([key, { old, new: newValue }]) => (
              <p key={key}>
                {key}: {old} → {newValue}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
};
