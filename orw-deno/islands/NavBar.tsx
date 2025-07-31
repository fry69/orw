// islands/NavBar.tsx - Navigation bar with real-time updates
import { useEffect } from "preact/hooks";
import {
  clientConfig,
  clientLists,
  clientStatus,
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
    <div class="navbar bg-base-300 px-4 min-h-16">
      {/* Left side - GitHub link and navigation */}
      <div class="navbar-start">
        <div class="flex items-center gap-2">
          {/* GitHub Link - only show if repository URL is configured */}
          {config.repositoryUrl && (
            <a
              href={config.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-ghost btn-square"
              title="GitHub repository"
            >
              <GitHubIcon size={24} />
            </a>
          )}

          {/* Navigation Menu */}
          <div class="flex gap-1">
            <a
              href="/list"
              class={`btn btn-ghost gap-2 ${
                globalThis.location?.pathname === "/list" ? "btn-accent" : ""
              }`}
            >
              <ModelIcon size={18} />
              Models
            </a>
            <a
              href="/changes"
              class={`btn btn-ghost gap-2 ${
                globalThis.location?.pathname === "/changes" ? "btn-accent" : ""
              }`}
            >
              <ChangeIcon size={18} />
              Changes
            </a>
            <a
              href="/removed"
              class={`btn btn-ghost gap-2 ${
                globalThis.location?.pathname === "/removed" ? "btn-accent" : ""
              }`}
            >
              <RemovedIcon size={18} />
              Removed
            </a>
            <a href="/rss" class="btn btn-ghost gap-2" title="RSS Feed">
              <RssIcon size={18} />
              RSS
            </a>
          </div>
        </div>
      </div>

      {/* Center - Filter input */}
      <div class="navbar-center">
        <div class="form-control">
          <div class="input-group">
            <input
              type="text"
              placeholder="Filter models..."
              value={filterText.value}
              onInput={(e) => filterText.value = (e.target as HTMLInputElement).value}
              class="input input-bordered w-full max-w-xs"
            />
          </div>
        </div>
      </div>

      {/* Right side - Status information */}
      <div class="navbar-end">
        <div class="hidden lg:flex stats stats-horizontal bg-transparent text-sm">
          {/* Timers group */}
          <div class="stat px-2">
            <div class="stat-desc">Last DB change</div>
            <div class="stat-value text-warning text-sm">{durations.dbLastChange}</div>
            <div class="stat-desc">Next API check</div>
            <div
              class={`stat-value text-sm ${
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

          {/* Models count group */}
          <div class="stat px-2">
            <div class="stat-desc">Active models</div>
            <div class="stat-value text-warning text-sm">{lists.models.length}</div>
            <div class="stat-desc">Removed models</div>
            <div class="stat-value text-warning text-sm">{lists.removed.length}</div>
          </div>

          {/* Changes */}
          <div class="stat px-2">
            <div class="stat-desc">Changes</div>
            <div class="stat-value text-warning text-sm">{lists.changes.length}</div>
            {dbFirstChangeTimestamp && (
              <div class="stat-desc text-xs">
                since {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
              </div>
            )}
          </div>

          {/* Version */}
          <div class="stat px-2">
            <div class="stat-desc">Version</div>
            <div class="stat-value text-sm">{VERSION}</div>
          </div>
        </div>

        {/* Mobile-friendly compact version */}
        <div class="lg:hidden">
          <div class="dropdown dropdown-end">
            <div tabindex={0} role="button" class="btn btn-ghost">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
