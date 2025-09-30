// orw-deno/components/navbar/StatusInfo.tsx

import { DateTime } from "luxon";
import { VERSION } from "@orw/lib/constants";
import type { Lists, WatcherStatus } from "@orw/lib/types";
import { InfoIcon } from "../Icons.tsx";

interface StatusInfoProps {
  status: WatcherStatus;
  lists: Lists;
  durations: {
    dbLastChange: string;
    apiNextCheck: string;
  };
  dbFirstChangeTimestamp: string;
  buildString: string;
}

export default function StatusInfo(
  { status, lists, durations, dbFirstChangeTimestamp, buildString }: StatusInfoProps,
) {
  const apiStatusClass = status.apiLastCheckStatus === "success"
    ? "text-success"
    : status.apiLastCheckStatus === "failure"
    ? "text-error"
    : "text-info";

  return (
    <>
      {/* Desktop status (lg) */}
      <div class="hidden lg:grid grid-cols-3 gap-x-6 text-xs items-start">
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Next API check:</span>
            <span class={`font-medium truncate ${apiStatusClass}`}>{durations.apiNextCheck}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Last DB change:</span>
            <span class="text-warning font-medium truncate">{durations.dbLastChange}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Models:</span>
            <span class="text-primary font-medium">{lists.models.length}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Removed:</span>
            <span class="text-warning font-medium">{lists.removed.length}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Changes:</span>
            <span class="text-primary font-medium">{lists.changes.length}</span>
          </div>
          {dbFirstChangeTimestamp && (
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 shrink-0">Since:</span>
              <span class="text-base-content/80 font-medium truncate">
                {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Medium screen status (md) */}
      <div class="hidden md:grid lg:hidden grid-cols-2 gap-x-4 text-xs items-start">
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">API:</span>
            <span class={`font-medium truncate ${apiStatusClass}`}>{durations.apiNextCheck}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">DB:</span>
            <span class="text-warning font-medium truncate">{durations.dbLastChange}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Models:</span>
            <span class="text-primary font-medium">{lists.models.length}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Changes:</span>
            <span class="text-primary font-medium">{lists.changes.length}</span>
          </div>
        </div>
      </div>

      {/* Mobile status (sm) */}
      <div class="md:hidden">
        <div class="dropdown dropdown-end">
          <div tabIndex={0} role="button" class="btn btn-ghost btn-sm">
            <InfoIcon />
          </div>
          <div
            tabIndex={0}
            class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow"
          >
            <div class="stats stats-vertical">
              <div class="stat">
                <div class="stat-title">Models</div>
                <div class="stat-value text-lg text-primary">{lists.models.length}</div>
                <div class="stat-desc">
                  <span class="text-warning">{lists.removed.length}</span> removed
                </div>
              </div>
              <div class="stat">
                <div class="stat-title">Changes</div>
                <div class="stat-value text-lg text-primary">{lists.changes.length}</div>
                {dbFirstChangeTimestamp && (
                  <div class="stat-desc">
                    since {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
                  </div>
                )}
              </div>
              <div class="stat">
                <div class="stat-title">Timers</div>
                <div class="stat-desc">
                  Last DB change:{" "}
                  <span class="stat-value text-sm text-warning">{durations.dbLastChange}</span>
                </div>
                <div class="stat-desc">
                  Next API check:{" "}
                  <span class={`stat-value text-sm  ${apiStatusClass}`}>
                    {durations.apiNextCheck}
                  </span>
                </div>
              </div>
              <div class="stat">
                <div class="stat-title">Version</div>
                <div class="stat-value text-lg text-info">{VERSION}</div>
                <div class="stat-desc">{buildString}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
