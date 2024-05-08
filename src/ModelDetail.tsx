import { useContext, useEffect, useState } from "react";
import type { Model } from "../watch-or";
import { DynamicElementContext } from "./App";
import type { ModelDiff } from "./types";
import { DateTime } from "luxon";
import { calcCost, dateString, dateStringDuration, durationAgo } from "./utils";

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

  let Changes;
  if (changes.length > 0) {
    Changes = (
      <>
        <h3>Changes</h3>
        {changes.map((change, index) => (
          <div key={index} className="change-entry">
            <p>
              {change.type} at {dateStringDuration(change.timestamp)}
            </p>
            {Object.entries(change.changes).map(
              ([key, { old, new: newValue }]) => (
                <p key={key}>
                  {key}: {old} → {newValue}
                </p>
              )
            )}
          </div>
        ))}
      </>
    );
  } else {
    Changes = <></>;
  }

  return (
    <div className="model-details">
      <h2>{model.name}</h2>
      <h3>Description</h3>
      <pre>{model.description}</pre>
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          <p style={{ fontSize: "large" }}>
            Input: <b>$ {calcCost(model.pricing.prompt).toFixed(2)}</b> per million tokens
            <br />
            Output: <b>$ {calcCost(model.pricing.completion).toFixed(2)}</b> per million
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
      {Changes}
    </div>
  );
};
