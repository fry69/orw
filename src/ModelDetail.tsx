import { useContext, useEffect, useMemo, useState } from "react";
import type { Model } from "../types";
import { GlobalContext } from "./GlobalState";
import type { ModelDiffClient } from "./types";
import { calcCost, changeSnippet, dateStringDuration } from "./utils";

export const ModelDetail: React.FC = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiffClient[]>([]);
  const { setGlobalState } = useContext(GlobalContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      fetch(`/api/model?id=${id}`)
        .then((res) => res.json())
        .then((data) => {
          setModel(data.data.model);
          setChanges(data.data.changes);
          setGlobalState((prevState) => ({
            ...prevState,
            apiLastCheck: data.apiLastCheck,
            dbLastChange: data.dbLastChange,
          }));
        });
    }
  }, []);

  const modelStringMemo = useMemo(
    () => <div className="model-id"> Model ID: {model?.id} </div>,
    [model]
  );

  // setDynamicElement(<div className="model-id"> Model ID: {model?.id} </div>); // <- 100% browser CPU

  useEffect(() => {
    setGlobalState((prevState) => ({
      ...prevState,
      navBarDynamicElement: modelStringMemo,
    })); // <- using the memoized string is fine
  }, [model]);

  if (!model) {
    return <div>Loading...</div>;
  }

  // Create a new object that hides the already shown 'description' property
  const modelDetails: any = { ...model };
  modelDetails["description"] = "[...]";

  const Changes = () => {
    if (changes.length > 0) {
      return (
        <>
          <h3>Changes</h3>
          {changes.map((change, index) => (
            <div key={index} className="change-entry">
              <p>
                {change.type} at {dateStringDuration(change.timestamp)}
              </p>
              {changeSnippet(change)}
            </div>
          ))}
        </>
      );
    } else {
      return <></>;
    }
  };

  return (
    <div className="model-details">
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          <p style={{ fontSize: "large" }}>
            Input: <b>$ {calcCost(model.pricing.prompt).toFixed(2)}</b> per
            million tokens
            <br />
            Output: <b>$ {calcCost(model.pricing.completion).toFixed(2)}</b> per
            million tokens
          </p>
        </div>
        <div className="change-model-name">
          <h2>{model.name}</h2>
        </div>
        <div>
          <h3>Context Length</h3>
          <p style={{ fontSize: "x-large", textAlign: "center" }}>
            {model.context_length}
          </p>
        </div>
      </div>
      <h3>Description</h3>
      <pre>{model.description}</pre>
      <h3>Model Details</h3>
      <pre>{JSON.stringify(modelDetails, null, 4)}</pre>
      {Changes()}
    </div>
  );
};
