import { useContext, useEffect, useState } from "react";
import type { FC, ReactNode } from "react";
import type { Model, ModelDiff } from "../global";
import { GlobalContext } from "./GlobalState";
import { calcCostPerMillion, calcCostPerThousand, dateStringDuration } from "./utils";
import { ChangeSnippet } from "./ChangeSnippet";

export const ModelDetail: FC = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiff[]>([]);
  const [removed, setRemoved] = useState<boolean>(false);
  const { globalStatus, globalLists, setGlobalClient, setError } = useContext(GlobalContext);

  useEffect(() => {
    setGlobalClient((prevState) => ({
      ...prevState,
      navBarDynamicElement: (
        <>
          <span className="dynamic-element"></span>
        </>
      ),
    }));
  }, []);

  useEffect(() => {
    if (!globalStatus.isValid) {
      // No point in doing anything, if the data is not valid.
      return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (!id) {
      setError("No model ID provided.");
      return;
    }
    let foundModel: Model | undefined = globalLists.models.find((obj: Model) => obj.id === id);
    if (!foundModel) {
      const removedModel: Model | undefined = globalLists.removed.find(
        (obj: Model) => obj.id === id
      );
      if (removedModel) {
        setRemoved(true);
        foundModel = removedModel;
      } else {
        setError("Unknown model ID.");
        return;
      }
    }
    setModel(foundModel);
    const foundChanges: ModelDiff[] = globalLists.changes.filter((obj) => obj.id === id);
    setChanges(foundChanges);
  }, [globalLists.models, globalLists.removed, globalStatus.isValid]);

  if (!model) {
    return <></>;
  }

  // Create a new object that hides the already shown 'description' property
  const modelDetails: Model = { ...model };
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
              <ChangeSnippet change={change} hideTypes={["added", "removed"]} />
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
            <PriceElement prefix="Input:" price={model.pricing.prompt} unit="tokens" />
            <PriceElement prefix="Output:" price={model.pricing.completion} unit="tokens" />
            <PriceElement
              prefix="Request:"
              price={model.pricing.request}
              unit="requests"
              thousands
            />
            <PriceElement prefix="Image:" price={model.pricing.image} unit="images" thousands />
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

  const DelContainer: FC<{ children: ReactNode }> = ({ children }): ReactNode => {
    if (removed) {
      return (
        <>
          <del>{children}</del>
        </>
      );
    }
    return children;
  };

  interface PriceElementProps {
    prefix: string;
    price: string;
    unit: string;
    thousands?: boolean;
  }

  const PriceElement = ({ prefix, price, unit, thousands = false }: PriceElementProps) => {
    if (parseFloat(price) > 0) {
      const formattedPrice = thousands
        ? calcCostPerThousand(price, unit)
        : calcCostPerMillion(price, unit);
      return (
        <>
          {prefix}
          <b>{formattedPrice}</b>
        </>
      );
    }
  };

  const ModelName = () => {
    if (removed) {
      return (
        <>
          {model.name + " "}
          <b style={{ color: "red" }}>(removed)</b>
        </>
      );
    }
    return <>{model.name}</>;
  };

  return (
    <div className="model-details">
      <div className="model-details-col-container">
        <div>
          <h3>Price</h3>
          <DelContainer>
            <Price />
          </DelContainer>
        </div>
        <div>
          <h2 className="model-details-model-name">
            <ModelName />
          </h2>
          <DelContainer>
            <h4>{model.id}</h4>
          </DelContainer>
        </div>
        <div>
          <h3>Context Length</h3>
          <DelContainer>
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
      <Changes />
    </div>
  );
};
