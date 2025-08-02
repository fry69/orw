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
            {/* Full links on larger screens */}
            <div class="hidden xl:flex gap-1">
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

            {/* Icon-only links on medium screens */}
            <div class="hidden lg:flex xl:hidden gap-1">
              <a
                href="/list"
                class={`btn btn-ghost btn-square btn-sm ${
                  globalThis.location?.pathname === "/list" ? "btn-accent" : ""
                }`}
                title="Models"
              >
                <ModelIcon size={16} />
              </a>
              <a
                href="/changes"
                class={`btn btn-ghost btn-square btn-sm ${
                  globalThis.location?.pathname === "/changes" ? "btn-accent" : ""
                }`}
                title="Changes"
              >
                <ChangeIcon size={16} />
              </a>
              <a
                href="/removed"
                class={`btn btn-ghost btn-square btn-sm ${
                  globalThis.location?.pathname === "/removed" ? "btn-accent" : ""
                }`}
                title="Removed"
              >
                <RemovedIcon size={16} />
              </a>
              <a href="/rss" class="btn btn-ghost btn-square btn-sm" title="RSS Feed">
                <RssIcon size={16} />
              </a>
            </div>

            {/* Mobile dropdown menu */}
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
        {/* Desktop status - compact 2-line format */}
        <div class="hidden xl:flex flex-col text-xs gap-1">
          <div class="flex gap-4">
            <div class="text-center">
              <div class="text-base-content/60">Last DB</div>
              <div class="text-warning font-medium">{durations.dbLastChange}</div>
            </div>
            <div class="text-center">
              <div class="text-base-content/60">API Check</div>
              <div
                class={`font-medium ${
                  status.apiLastCheckStatus === "success"
                    ? "text-success"
                    : status.apiLastCheckStatus === "failure"
                    ? "text-error"
                    : "text-info"
                }`}
              >
                {durations.apiLastCheck}
              </div>
            </div>
            <div class="text-center">
              <div class="text-base-content/60">Models</div>
              <div class="text-warning font-medium">{lists.models.length}</div>
            </div>
            <div class="text-center">
              <div class="text-base-content/60">Changes</div>
              <div class="text-warning font-medium">{lists.changes.length}</div>
            </div>
          </div>
          <div class="flex gap-4 justify-center">
            <div class="text-center">
              <div class="text-base-content/60">Removed</div>
              <div class="text-warning font-medium">{lists.removed.length}</div>
            </div>
            {dbFirstChangeTimestamp && (
              <div class="text-center">
                <div class="text-base-content/60">Since</div>
                <div class="text-base-content/80 font-medium">
                  {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
                </div>
              </div>
            )}
            <div class="text-center">
              <div class="text-base-content/60">Version</div>
              <div class="text-base-content font-medium">{VERSION}</div>
            </div>
          </div>
        </div>

        {/* Tablet status - hover dropdown */}
        <div class="hidden lg:flex xl:hidden">
          <div class="dropdown dropdown-end dropdown-hover">
            <div tabindex={0} role="button" class="btn btn-ghost btn-sm gap-2">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
              <span class="text-xs">{lists.models.length}M</span>
            </div>
            <div tabindex={0} class="dropdown-content bg-base-100 rounded-box z-[1] w-72 p-4 shadow">
              <div class="grid grid-cols-2 gap-4 text-xs">
                <div class="text-center">
                  <div class="text-base-content/60">Last DB change</div>
                  <div class="text-warning font-medium">{durations.dbLastChange}</div>
                </div>
                <div class="text-center">
                  <div class="text-base-content/60">Next API check</div>
                  <div
                    class={`font-medium ${
                      status.apiLastCheckStatus === "success"
                        ? "text-success"
                        : status.apiLastCheckStatus === "failure"
                        ? "text-error"
                        : "text-info"
                    }`}
                  >
                    {durations.apiLastCheck}
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-base-content/60">Active models</div>
                  <div class="text-warning font-medium">{lists.models.length}</div>
                </div>
                <div class="text-center">
                  <div class="text-base-content/60">Removed models</div>
                  <div class="text-warning font-medium">{lists.removed.length}</div>
                </div>
                <div class="text-center">
                  <div class="text-base-content/60">Changes</div>
                  <div class="text-warning font-medium">{lists.changes.length}</div>
                </div>
                <div class="text-center">
                  <div class="text-base-content/60">Version</div>
                  <div class="text-base-content font-medium">{VERSION}</div>
                </div>
                {dbFirstChangeTimestamp && (
                  <div class="col-span-2 text-center">
                    <div class="text-base-content/60">Since</div>
                    <div class="text-base-content/80 font-medium">
                      {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile status - click dropdown */}
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
