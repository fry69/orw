import { DateTime, Duration } from "luxon";
import { toHumanDurationExtended } from "@kitsuyui/luxon-ext";

export const dateString = (timestamp: string) =>
  DateTime.fromISO(timestamp).setLocale("en-us").toLocaleString(DateTime.DATETIME_MED);

export const durationAgo = (timestamp: DateTime | string, until: boolean = false) => {
  if (typeof timestamp === "string" && timestamp !== "") {
    timestamp = DateTime.fromISO(timestamp);
  }
  if (DateTime.isDateTime(timestamp)) {
    let duration: Duration;
    if (until) {
      duration = timestamp.setLocale("en-us").plus({ hours: 1 }).diffNow();
      if (duration.toMillis() < 0) {
        return "[now]";
      }
    } else {
      duration = timestamp.setLocale("en-us").diffNow();
    }
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

export const calcCost = (floatString: string, factor: number, unit?: string): string => {
  const cost = Math.round(parseFloat(floatString) * factor * 100) / 100;
  return cost > 0 ? "$" + cost.toFixed(2) + " " + unit : "[free]";
};

export const calcCostPerMillion = (floatString: string, unit?: string): string =>
  calcCost(floatString, 1_000_000, unit ? "per million " + unit : "");

export const calcCostPerThousand = (floatString: string, unit?: string): string =>
  calcCost(floatString, 1_000, unit ? "per thousand " + unit : "");