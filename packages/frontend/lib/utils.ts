// lib/utils.ts - Centralized utility functions
import { DateTime } from "luxon";
import { toHumanDurationExtended } from "@kitsuyui/luxon-ext";
import { WATCHER_INTERVAL_MS } from "@orw/lib/constants";

/**
 * Converts a timestamp string to a formatted, locale-specific date and time string.
 * e.g., "10/20/2023, 5:00:00 PM"
 * @param timestamp - The ISO timestamp string to convert.
 * @returns The formatted date string.
 */
export const formatDateTime = (timestamp: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

/**
 * Calculates a human-readable duration from a timestamp to now.
 * e.g., "5 min", "2 hrs", "3 days"
 * @param timestamp - The ISO timestamp to calculate the duration from.
 * @returns The formatted duration string.
 */
export const duration = (timestamp: string, nextAPICheck?: boolean): string => {
  if (!timestamp) return "";

  let pastDate: DateTime;
  if (nextAPICheck) {
    pastDate = DateTime.fromISO(timestamp).plus({ milliseconds: WATCHER_INTERVAL_MS });
  } else {
    pastDate = DateTime.fromISO(timestamp);
  }

  if (!pastDate.isValid) return "";

  const now = DateTime.now().setLocale("en-US");
  const diff = now.diff(pastDate);

  // Report if the API check time has passed
  if (nextAPICheck && diff.as("milliseconds") > 0) {
    return "due";
  }

  // Handle cases where the duration is less than a minute
  if (Math.abs(diff.as("minutes")) < 1) {
    return "now";
  }

  // Use a library to get a human-readable, single-unit duration
  const humanReadable = toHumanDurationExtended(diff, {
    human: { unitDisplay: "short" },
    rounding: { numOfUnits: 1, minUnit: "minutes" },
  });

  return humanReadable;
};

/**
 * Formats a number with commas as thousands separators.
 * @param num - The number to format.
 * @returns The formatted number string.
 */
export const formatNumber = (num: number): string => {
  return num.toLocaleString("en-US");
};

/**
 * Formats a price string (representing cost per token) into cost per million tokens.
 * @param price - The price string.
 * @returns The formatted price string (e.g., "$0.50 per million tokens").
 */
export const showPricePerMillion = (price: string): string => {
  const priceFloat = parseFloat(price);
  if (isNaN(priceFloat) || priceFloat === 0) {
    return "[free]";
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
 * Formats a single change value for display with human-readable formatting.
 */
export const formatChangeValue = (value: unknown, path: string): string => {
  if (value === null) return "[null]";
  if (value === undefined) return "[undefined]";

  // Handle pricing fields with proper formatting
  if (path.includes("pricing.")) {
    if (typeof value === "string") {
      return `${showPricePerMillion(value)} per million tokens`;
    }
  }

  // Handle numbers with locale formatting
  if (typeof value === "number") {
    return formatNumber(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.join(", ")}]`;
  }

  // Default: return string as-is, otherwise stringify
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

/**
 * Calculates percentage change for numeric values.
 * Returns an empty string if not applicable.
 */
export const calculatePercentageChange = (oldVal: unknown, newVal: unknown): string => {
  // Ensure both values are numbers (or can be parsed from strings)
  const oldNum = typeof oldVal === "string" ? parseFloat(oldVal) : oldVal as number;
  const newNum = typeof newVal === "string" ? parseFloat(newVal) : newVal as number;

  if (typeof oldNum !== "number" || typeof newNum !== "number" || isNaN(oldNum) || isNaN(newNum)) {
    return "";
  }
  if (oldNum === 0) return ""; // Avoid division by zero

  const change = ((newNum - oldNum) / oldNum) * 100;
  if (Math.round(change) === 0) return ""; // Don't show for tiny changes

  const sign = change >= 0 ? "+" : "";
  return ` (${sign}${Math.round(change)}%)`;
};
