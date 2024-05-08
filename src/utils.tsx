import { DateTime, type DurationUnit } from "luxon";
import { toHumanDurationExtended } from "@kitsuyui/luxon-ext";

export const dateString = (timestamp: string) =>
  DateTime.fromISO(timestamp)
    .setLocale("en-us")
    .toLocaleString(DateTime.DATETIME_MED);

export const durationAgo = (timestamp: DateTime) => {
  const duration = timestamp.setLocale("en-us").diffNow();
  return toHumanDurationExtended(duration);
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
