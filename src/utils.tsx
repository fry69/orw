import { DateTime, Duration } from "luxon";
import { toHumanDurationExtended } from "@kitsuyui/luxon-ext";
import { ReactNode } from "react";

/**
 * Converts a timestamp string to a formatted date string.
 * @param timestamp - The timestamp string to convert.
 * @returns The formatted date string.
 */
export const dateString = (timestamp: string): string =>
  DateTime.fromISO(timestamp).setLocale("en-us").toLocaleString(DateTime.DATETIME_MED);

/**
 * Calculates the duration between the current time and a given timestamp.
 * @param timestamp - The timestamp to calculate the duration to.
 * @param until - If true, calculates the duration until the timestamp.
 * @returns The formatted duration string.
 */
export const durationAgo = (timestamp: DateTime | string, until: boolean = false): string => {
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

/**
 * Renders a date string and its duration ago.
 * @param timestamp - The timestamp string to convert.
 * @returns The JSX element containing the date string and duration.
 */
export const dateStringDuration = (timestamp: string): ReactNode => (
  <>
    <b>{dateString(timestamp)}</b>
    {` ( ${durationAgo(DateTime.fromISO(timestamp))} ago )`}
  </>
);

/**
 * Calculates and formats a price based on a given factor and unit.
 * @param floatString - The price as a string.
 * @param factor - The factor to multiply the price by.
 * @param unit - The unit of the price.
 * @returns The formatted price string.
 */
export const showPrice = (floatString: string, factor: number, unit?: string): string => {
  const cost = Math.round(parseFloat(floatString) * factor * 100) / 100;
  return cost > 0 ? "$" + cost.toFixed(2) + " " + unit : "[free]";
};

/**
 * Calculates and formats a price per million based on a given unit.
 * @param floatString - The price as a string.
 * @param unit - The unit of the price.
 * @returns The formatted price per million string.
 */
export const showPricePerMillion = (floatString: string, unit?: string): string =>
  showPrice(floatString, 1_000_000, unit ? "per million " + unit : "");

/**
 * Calculates and formats a price per thousand based on a given unit.
 * @param floatString - The price as a string.
 * @param unit - The unit of the price.
 * @returns The formatted price per thousand string.
 */
export const showPricePerThousand = (floatString: string, unit?: string): string =>
  showPrice(floatString, 1_000, unit ? "per thousand " + unit : "");
