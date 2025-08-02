// islands/NavBar.tsx - Navigation bar with real-time updates
import { useEffect } from "preact/hooks";
import {
  clientConfig,
  clientLists,
  clientStatus,
  filterStatus,
  filterText,
  navBarDurations,
} from "../lib/state.ts";
import { DateTime } from "luxon";
import { UI_REFRESH_MS, VERSION } from "../lib/constants.ts";
import { ChangeIcon, GitHubIcon, ModelIcon, RemovedIcon, RssIcon } from "../components/Icons.tsx";

export default function NavBar() {
  // Update durations every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // This will trigger computed signal updates
      clientStatus.value = { ...clientStatus.value };
    }, UI_REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

  const config = clientConfig.value;
  const status = clientStatus.value;
  const lists = clientLists.value;
  const durations = navBarDurations.value;

  // Calculate first change timestamp for display
  const dbFirstChangeTimestamp = lists.changes.at(-1)?.timestamp ?? "";

  return (
    <div class="navbar bg-base-300 px-4 min-h-12">
      {/* Left side - GitHub link and navigation */}
      <div class="navbar-start">
        <div class="flex items-center gap-2">
          {/* GitHub Link - only show if repository URL is configured */}
          {config.repositoryUrl && (
            <a
              href={config.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-ghost btn-square btn-sm"
              title="GitHub repository"
            >
              <GitHubIcon size={20} />
            </a>
          )}

          {/* Navigation Menu - responsive design */}
          <div class="flex gap-1">
            {/* Full links on larger screens - 1024px+ */}
            <div class="hidden lg:flex gap-1">
              <a
                href="/list"
                class={`btn btn-ghost btn-sm gap-2 ${
                  globalThis.location?.pathname === "/list" ? "btn-accent" : ""
                }`}
              >
                <ModelIcon size={16} />
                Models
              </a>
              <a
                href="/changes"
                class={`btn btn-ghost btn-sm gap-2 ${
                  globalThis.location?.pathname === "/changes" ? "btn-accent" : ""
                }`}
              >
                <ChangeIcon size={16} />
                Changes
              </a>
              <a
                href="/removed"
                class={`btn btn-ghost btn-sm gap-2 ${
                  globalThis.location?.pathname === "/removed" ? "btn-accent" : ""
                }`}
              >
                <RemovedIcon size={16} />
                Removed
              </a>
              <a href="/rss" class="btn btn-ghost btn-sm gap-2" title="RSS Feed">
                <RssIcon size={16} />
                RSS
              </a>
            </div>

            {/* Mobile dropdown menu - under 1024px */}
            <div class="lg:hidden">
              <div class="dropdown">
                <div tabindex={0} role="button" class="btn btn-ghost btn-sm">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </div>
                <ul tabindex={0} class="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow">
                  <li><a href="/list" class={globalThis.location?.pathname === "/list" ? "active" : ""}>
                    <ModelIcon size={16} />Models
                  </a></li>
                  <li><a href="/changes" class={globalThis.location?.pathname === "/changes" ? "active" : ""}>
                    <ChangeIcon size={16} />Changes
                  </a></li>
                  <li><a href="/removed" class={globalThis.location?.pathname === "/removed" ? "active" : ""}>
                    <RemovedIcon size={16} />Removed
                  </a></li>
                  <li><a href="/rss">
                    <RssIcon size={16} />RSS
                  </a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Center - Filter input */}
      <div class="navbar-center">
        <div class="form-control">
          <input
            type="text"
            placeholder="Filter models..."
            value={filterText.value}
            onInput={(e) => filterText.value = (e.target as HTMLInputElement).value}
            class="input input-bordered input-sm w-full max-w-xs"
          />
          {filterStatus.value && (
            <div class="text-center text-xs text-base-content/60 mt-1">
              {filterStatus.value}
            </div>
          )}
        </div>
      </div>

      {/* Right side - Status information */}
      <div class="navbar-end">
        {/* Desktop status - compact 2-line format with proper alignment - 1024px+ */}
        <div class="hidden lg:grid grid-cols-3 gap-x-6 text-xs items-start">
          {/* Column 1: DB/API */}
          <div class="flex flex-col gap-0.5 min-w-0">
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 shrink-0">DB:</span>
              <span class="text-warning font-medium truncate">{durations.dbLastChange}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-base-content/60 shrink-0">API:</span>
              <span
                class={`font-medium truncate ${
                  status.apiLastCheckStatus === "success"
                    ? "text-success"
                    : status.apiLastCheckStatus === "failure"
                    ? "text-error"
                    : "text-info"
                }`}
              >
                {durations.apiLastCheck}
              </span>
            </div>
          </div>

          {/* Column 2: Models/Removed */}
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

          {/* Column 3: Changes/Since */}
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

        {/* Mobile status - dropdown for small screens - under 1024px */}
        <div class="lg:hidden">
          <div class="dropdown dropdown-end">
            <div tabindex={0} role="button" class="btn btn-ghost btn-sm">
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
              tabindex={0}
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
                  <div class="stat-desc">
                    API: <span class={
                      status.apiLastCheckStatus === "success"
                        ? "text-success"
                        : status.apiLastCheckStatus === "failure"
                        ? "text-error"
                        : "text-info"
                    }>{durations.apiLastCheck}</span>
                  </div>
                </div>
                <div class="stat">
                  <div class="stat-title">Version</div>
                  <div class="stat-value text-lg">{VERSION}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
