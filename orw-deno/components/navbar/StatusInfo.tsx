// orw-deno/components/navbar/StatusInfo.tsx

import { DateTime } from "luxon";
import { VERSION } from "../../lib/constants.ts";
import type { ClientStatus, ClientLists } from "../../lib/types.ts";

interface StatusInfoProps {
  status: ClientStatus;
  lists: ClientLists;
  durations: {
    dbLastChange: string;
    apiLastCheck: string;
  };
  dbFirstChangeTimestamp: string;
}

export default function StatusInfo(
  { status, lists, durations, dbFirstChangeTimestamp }: StatusInfoProps,
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
            <span class="text-base-content/60 shrink-0">DB:</span>
            <span class="text-warning font-medium truncate">{durations.dbLastChange}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">API:</span>
            <span class={`font-medium truncate ${apiStatusClass}`}>{durations.apiLastCheck}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Models:</span>
            <span class="text-warning font-medium">{lists.models.length}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Removed:</span>
            <span class="text-warning font-medium">{lists.removed.length}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Changes:</span>
            <span class="text-warning font-medium">{lists.changes.length}</span>
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
            <span class="text-base-content/60 shrink-0">DB:</span>
            <span class="text-warning font-medium truncate">{durations.dbLastChange}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Models:</span>
            <span class="text-warning font-medium">{lists.models.length}</span>
          </div>
        </div>
        <div class="flex flex-col gap-0.5 min-w-0">
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">API:</span>
            <span class={`font-medium truncate ${apiStatusClass}`}>{durations.apiLastCheck}</span>
          </div>
          <div class="flex items-center gap-1">
            <span class="text-base-content/60 shrink-0">Changes:</span>
            <span class="text-warning font-medium">{lists.changes.length}</span>
          </div>
        </div>
      </div>

      {/* Mobile status (sm) */}
      <div class="md:hidden">
        <div class="dropdown dropdown-end">
          <div tabIndex={0} role="button" class="btn btn-ghost btn-sm">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div
            tabIndex={0}
            class="dropdown-content menu bg-base-100 rounded-box z-[1] w-64 p-2 shadow"
          >
            <div class="stats stats-vertical">
              <div class="stat">
                <div class="stat-title">Models</div>
                <div class="stat-value text-lg">{lists.models.length}</div>
                <div class="stat-desc">{lists.removed.length} removed</div>
              </div>
              <div class="stat">
                <div class="stat-title">Changes</div>
                <div class="stat-value text-lg">{lists.changes.length}</div>
                {dbFirstChangeTimestamp && (
                  <div class="stat-desc">
                    since {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
                  </div>
                )}
              </div>
              <div class="stat">
                <div class="stat-title">Timers</div>
                <div class="stat-value text-sm">{durations.dbLastChange}</div>
                <div class="stat-desc">API: <span class={apiStatusClass}>{durations.apiLastCheck}</span></div>
              </div>
              <div class="stat">
                <div class="stat-title">Version</div>
                <div class="stat-value text-lg">{VERSION}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
