import { useContext, useEffect, useMemo, useState } from "react";
import type { Model } from "../global";
import { GlobalContext } from "./GlobalState";
import type { ModelDiffClient } from "./client";
import {
  calcCostPerMillion,
  calcCostPerThousand,
  changeSnippet,
  dateStringDuration,
} from "./utils";
import Error from "./Error";

export const ModelDetail: React.FC = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiffClient[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { globalState, setGlobalState } = useContext(GlobalContext);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (!id) {
      setError("No model ID provided.");
      // error = "No model ID provided.";
      return;
    }
    const foundModel: Model = globalState.data.models.find((obj: Model) => obj.id === id);
    setModel(foundModel);
    const foundChanges: ModelDiffClient[] = globalState.data.changes.filter((obj) => obj.id === id);
    setChanges(foundChanges);
  }, [globalState.refreshTrigger]);

  useEffect(() => {
    setGlobalState((prevState) => ({
      ...prevState,
      navBarDynamicElement: (
        <>
          <span className="dynamic-element"></span>
        </>
      ),
    }));
  }, [model]);

  if (error) {
    return <Error message={error} type="error" />;
  }

  if (!model) {
    return <></>;
    // This produces just unnecessary flicker
    //   return <Error message="Loading..." type="info" />;
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
          <p className="price-container" style={{ fontSize: "large" }}>
            {PriceElement("Input:", model.pricing.prompt, "tokens")}
            {PriceElement("Output:", model.pricing.completion, "tokens")}
            {PriceElement("Request:", model.pricing.request, "requests", true)}
            {PriceElement("Image:", model.pricing.image, "images", true)}
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

  const PriceElement = (
    prefix: string,
    price: string,
    unit: string,
    thousands: boolean = false
  ) => {
    if (parseFloat(price) > 0) {
      const formattedPrice = thousands
        ? calcCostPerThousand(price, unit)
        : calcCostPerMillion(price, unit);
      return (
        <>
          <span className="price-prefix">{prefix}</span> <b>{formattedPrice}</b>
        </>
      );
    }
  };

  return (
    <div className="model-details">
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          {Price()}
        </div>
        <div>
          <h2 className="change-model-name">{model.name}</h2>
          <h4>{model.id}</h4>
        </div>
        <div>
          <h3>Context Length</h3>
          <p style={{ fontSize: "x-large", textAlign: "center" }}>
            {model.context_length.toLocaleString()}
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
