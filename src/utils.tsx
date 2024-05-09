import { DateTime } from "luxon";
import { toHumanDurationExtended } from "@kitsuyui/luxon-ext";
import type { ModelDiffClient } from "./types";

export const dateString = (timestamp: string) =>
  DateTime.fromISO(timestamp)
    .setLocale("en-us")
    .toLocaleString(DateTime.DATETIME_MED);

export const durationAgo = (timestamp: DateTime | string) => {
  if (typeof timestamp === "string" && timestamp !== "") {
    timestamp = DateTime.fromISO(timestamp);
  }
  if (DateTime.isDateTime(timestamp)) {
    const duration = timestamp.setLocale("en-us").diffNow();
    return toHumanDurationExtended(duration, {
      human: {
        unitDisplay: "narrow",
        unit: "short",
      },
      rounding: {
        numOfUnits: 2,
        minUnit: "minutes",
        roundingMethod: "round",
      },
    });
  }
  return "";
};

export const dateStringDuration = (timestamp: string) => (
  <>
    <b>{dateString(timestamp)}</b>
    {` ( ${durationAgo(DateTime.fromISO(timestamp))} ago )`}
  </>
);

export const calcCost = (floatString: string) => {
  const cost = Math.round(parseFloat(floatString) * 1000000 * 100) / 100;
  return cost > 0 ? cost : 0;
};

export const changeSnippet = (change: ModelDiffClient) => {
  if (change.changes) {
    return (
      <>
        {Object.entries(change.changes).map(([key, { old, new: newValue }]) => {
          if (key.includes("pricing")) {
            old = calcCost(old);
            newValue = calcCost(newValue);
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
