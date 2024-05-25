import type { ModelChangeType, ModelDiff } from "../global";
import { calcCostPerMillion, calcCostPerThousand } from "./utils";

interface ChangeSnippetProps {
  change: ModelDiff;
  hideTypes: ModelChangeType[];
}

const calcCost = (
  oldValue: string,
  newValue: string,
  calcFn: typeof calcCostPerMillion,
  unit: string
): [oldPrice: string, newPrice: string, percentage: string] => {
  const oldPrice = calcFn(oldValue, unit);
  const newPrice = calcFn(newValue, unit);
  let percentageString: string;
  if (parseFloat(oldValue) <= 0 || parseFloat(newValue) <= 0) {
    percentageString = "";
  } else {
    const percentage = ((parseFloat(newValue) - parseFloat(oldValue)) / parseFloat(oldValue)) * 100;
    percentageString = "(" + (percentage > 0 ? "+" : "") + percentage.toFixed(0) + "%)";
  }
  return [oldPrice, newPrice, percentageString];
};

export const ChangeSnippet = ({ change, hideTypes }: ChangeSnippetProps) => {
  if (hideTypes.includes(change.type)) {
    return;
  }
  if (change.changes) {
    return (
      <>
        {Object.entries(change.changes).map(([key, { old, new: newValue }]) => {
          let percentage = "";
          if (key === "pricing.prompt" || key === "pricing.completion") {
            [old, newValue, percentage] = calcCost(old, newValue, calcCostPerMillion, "tokens");
          } else if (key === "pricing.request") {
            [old, newValue, percentage] = calcCost(old, newValue, calcCostPerThousand, "requests");
          } else if (key === "pricing.image") {
            [old, newValue, percentage] = calcCost(old, newValue, calcCostPerThousand, "images");
          }

          if (key.includes("description")) {
            return (
              <div key={key}>
                Description (old):
                <pre style={{ whiteSpace: "pre-wrap" }}>{old}</pre>
                Description (new):
                <pre style={{ whiteSpace: "pre-wrap" }}>{newValue}</pre>
              </div>
            );
          }
          return (
            <p key={key}>
              {key}: {old.toLocaleString()} → {newValue.toLocaleString()} {percentage}
            </p>
          );
        })}
      </>
    );
  }
  return (
    <>
      <pre style={{ whiteSpace: "pre-wrap" }}> {JSON.stringify(change.model, null, 4)} </pre>
    </>
  );
};
