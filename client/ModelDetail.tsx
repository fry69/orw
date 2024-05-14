import { useContext, useEffect, useMemo, useState } from "react";
import type { Model } from "../global";
import { GlobalContext } from "./GlobalState";
import type { ModelDiffClient } from "./client";
import { calcCostPerMillion, calcCostPerThousand, changeSnippet, dateStringDuration } from "./utils";
import Error from "./Error";

export const ModelDetail: React.FC = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiffClient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { globalState, setGlobalState } = useContext(GlobalContext);

  useEffect(() => {
    const fetchModel = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const id = urlParams.get("id");
        if (!id) {
          setError("No model ID provided.");
          return;
        }

        const response = await fetch(`/api/model?id=${id}`);
        if (!response.ok) {
          setError(`Error fetching model: ${response.status} - ${response.statusText}`);
          return;
        }

        const data = await response.json();
        setModel(data.data.model);
        setChanges(data.data.changes);
        setGlobalState((prevState) => ({
          ...prevState,
          status: data.status,
        }));
      } catch (err) {
        setError("An unexpected error occurred while fetching the model.");
      }
    };

    fetchModel();
  }, [globalState.refreshTrigger]);

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

  if (error) {
    return <Error message={error} type="error" />;
  }

  if (!model) {
    return <Error message="Loading..." type="info" />;
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
              {change.type === "added" ? "" : changeSnippet(change)}
            </div>
          ))}
        </>
      );
    } else {
      return <></>;
    }
  };

  const Price = () => {
    if (model.id === "openrouter/auto") {
      return (
        <>
          <p style={{ fontSize: "large" }}>
            <b>See model</b>
          </p>
        </>
      );
    }
    if (parseFloat(model.pricing.completion) > 0) {
      return (
        <>
          <p style={{ fontSize: "large" }}>
            {InputPrice()}
            {OutputPrice()}
            {RequestPrice()}
            {ImagePrice()}
          </p>
        </>
      );
    }
    return (
      <>
        <p style={{ fontSize: "large", color: "green" }}>
          <b>Free</b>
        </p>
      </>
    );
  };

  const InputPrice = () => {
    if (parseFloat(model.pricing.prompt) > 0) {
      return <>
      Input: <b>{calcCostPerMillion(model.pricing.prompt, "tokens")}</b></>;
    }
  };

  const OutputPrice = () => {
    if (parseFloat(model.pricing.completion) > 0) {
      return <><br />
      Output: <b>{calcCostPerMillion(model.pricing.completion, "tokens")}</b></>;
    }
  };

  const RequestPrice = () => {
    if (parseFloat(model.pricing.request) > 0) {
      return <><br />
      Request: <b>{calcCostPerThousand(model.pricing.request, "requests")}</b></>;
    }
  };

  const ImagePrice = () => {
    if (parseFloat(model.pricing.image) > 0) {
      return <><br />
      Image: <b>{calcCostPerThousand(model.pricing.image, "images")}</b></>;
    }
  };


  return (
    <div className="model-details">
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          {Price()}
        </div>
        <div className="change-model-name">
          <h2>{model.name}</h2>
        </div>
        <div>
          <h3>Context Length</h3>
          <p style={{ fontSize: "x-large", textAlign: "center" }}>{model.context_length}</p>
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