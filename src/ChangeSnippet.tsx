// import React from "react";
import type { ModelChangeType, ModelDiff } from "../shared/global.ts";
import { showPricePerMillion, showPricePerThousand } from "./utils.tsx";
import type { ReactNode } from "react";

/**
 * Props for ChangeSnippet component.
 */
export interface ChangeSnippetProps {
  /** The change to display. */
  change: ModelDiff;
  /** The types of changes to hide. */
  hideTypes: ModelChangeType[];
}

/**
 * Type for ChangeSnippet component.
 */
export type ChangeSnippetType = {
  ({ change, hideTypes }: ChangeSnippetProps): ReactNode;
};

/**
 * Shows the price difference between two price values and returns an array containing the old price, new price, and percentage difference.
 * @param oldValue - The old price.
 * @param newValue - The new price.
 * @param showFn - The function to use to show the price.
 * @param unit - The unit to show the price in.
 * @returns - The old price, new price, and percentage difference.
 */
const showPrice = (
  oldValue: string,
  newValue: string,
  showFn: typeof showPricePerMillion,
  unit: string,
): [oldPrice: string, newPrice: string, percentage: string] => {
  const oldPrice = showFn(oldValue, unit);
  const newPrice = showFn(newValue, unit);
  let percentageString: string;
  if (parseFloat(oldValue) <= 0 || parseFloat(newValue) <= 0) {
    percentageString = "";
  } else {
    const percentage = ((parseFloat(newValue) - parseFloat(oldValue)) / parseFloat(oldValue)) * 100;
    percentageString = "(" + (percentage > 0 ? "+" : "") + percentage.toFixed(0) + "%)";
  }
  return [oldPrice, newPrice, percentageString];
};

/**
 * Renders a snippet of a change.
 * @param props - The props for the component.
 * @returns - The rendered snippet.
 */
export const ChangeSnippet: ChangeSnippetType = ({
  change,
  hideTypes,
}: ChangeSnippetProps): ReactNode => {
  if (hideTypes.includes(change.type)) {
    return;
  }
  if (typeof change.changes === "object") {
    return Object.entries(change.changes).map(([key, { old, new: newValue }]) => {
      let percentage = "";

      // Type guard to ensure old and newValue are strings for price calculations
      const isString = (value: unknown): value is string => typeof value === "string";

      if (key === "pricing.prompt" || key === "pricing.completion") {
        if (isString(old) && isString(newValue)) {
          [old, newValue, percentage] = showPrice(old, newValue, showPricePerMillion, "tokens");
        }
      } else if (key === "pricing.request") {
        if (isString(old) && isString(newValue)) {
          [old, newValue, percentage] = showPrice(old, newValue, showPricePerThousand, "requests");
        }
      } else if (key === "pricing.image") {
        if (isString(old) && isString(newValue)) {
          [old, newValue, percentage] = showPrice(old, newValue, showPricePerThousand, "images");
        }
      }

      if (key.includes("description")) {
        return (
          <div key={key}>
            Description (old):
            <pre style={{ whiteSpace: "pre-wrap" }}>{isString(old) ? old : JSON.stringify(old)}</pre>
            Description (new):
            <pre style={{ whiteSpace: "pre-wrap" }}>{isString(newValue) ? newValue : JSON.stringify(newValue)}</pre>
          </div>
        );
      }

      // Safe rendering with proper type handling
      const renderValue = (value: unknown): string => {
        if (value === null || value === undefined) return "[null]";
        if (typeof value === "string" || typeof value === "number") {
          return value.toLocaleString();
        }
        return JSON.stringify(value);
      };

      return (
        <p key={key}>
          {key}: {renderValue(old)} → {renderValue(newValue)}
          {percentage && " " + percentage}
        </p>
      );
    });
  } else {
    return <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(change.model, null, 4)}</pre>;
  }
};
