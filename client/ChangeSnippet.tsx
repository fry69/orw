import type { ModelChangeType, ModelDiff } from "../global";
import { calcCostPerMillion, calcCostPerThousand } from "./utils";

interface ChangeSnippetProps {
  change: ModelDiff;
  hideTypes: ModelChangeType[];
}

export const ChangeSnippet = ({ change, hideTypes }: ChangeSnippetProps) => {
  if (hideTypes.includes(change.type)) {
    return;
  }
  if (change.changes) {
    return (
      <>
        {Object.entries(change.changes).map(([key, { old, new: newValue }]) => {
          if (key === "pricing.prompt" || key === "pricing.completion") {
            old = calcCostPerMillion(old, "tokens");
            newValue = calcCostPerMillion(newValue, "tokens");
          } else if (key === "pricing.request") {
            old = calcCostPerThousand(old, "requests");
            newValue = calcCostPerThousand(newValue, "requests");
          } else if (key === "pricing.image") {
            old = calcCostPerThousand(old, "images");
            newValue = calcCostPerThousand(newValue, "images");
          }

          if (key.includes("description")) {
            return (
              <div key={key}>
                Description (old):
                <pre>{old}</pre>
                Description (new):
                <pre>{newValue}</pre>
              </div>
            );
          }
          return (
            <p key={key}>
              {key}: {old} → {newValue}
            </p>
          );
        })}
      </>
    );
  }
  return (
    <>
      <pre> {JSON.stringify(change.model, null, 4)} </pre>
    </>
  );
};
