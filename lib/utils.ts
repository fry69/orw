// lib/utils.ts - Utility functions (migrated from src/utils.tsx, JSX removed)
import { DateTime, Duration } from "luxon";
import { toHumanDurationExtended } from "@kitsuyui/luxon-ext";

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
      duration = DateTime.now().setLocale("en-us").diff(timestamp);
    }
    return toHumanDurationExtended(duration, { rounding: { numOfUnits: 1, minUnit: "minutes" } });
  }
  return "";
};

/**
 * Shows price per million tokens.
 * @param price - The price per token.
 * @returns The formatted price string.
 */
export const showPricePerMillion = (price: string): string => {
  const priceFloat = parseFloat(price);
  if (isNaN(priceFloat)) {
    return "N/A";
  }
  const pricePerMillion = priceFloat * 1_000_000;
  return `$${
    pricePerMillion.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }`;
};

/**
 * Formats a number for display.
 * @param num - The number to format.
 * @returns The formatted number string.
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US");
};

/**
 * Truncates a string to a maximum length.
 * @param str - The string to truncate.
 * @param maxLength - The maximum length.
 * @returns The truncated string.
 */
export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) {
    return str;
  }
  return str.slice(0, maxLength - 3) + "...";
};
