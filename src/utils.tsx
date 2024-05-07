import { DateTime, type DurationUnit } from "luxon";

export const dateString = (timestamp: string) =>
  DateTime.fromISO(timestamp)
    .setLocale("en-us")
    .toLocaleString(DateTime.DATETIME_MED);

export const durationAgo = (
  timestamp: DateTime,
  round: DurationUnit = "hours"
) =>
  timestamp
    .setLocale("en-us")
    .diffNow([round])
    .negate()
    .toHuman({ maximumFractionDigits: 0 });

export const dateStringDuration = (timestamp: string) => (
  <>
    <b>{dateString(timestamp)}</b>
    {` ( ${durationAgo(DateTime.fromISO(timestamp))} ago )`}
  </>
);
