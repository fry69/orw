// islands/NavBar.tsx - Navigation bar with real-time updates
import { useEffect } from "preact/hooks";
import { clientLists, clientStatus, navBarDurations } from "../lib/state.ts";
import { DateTime } from "luxon";
import { UI_REFRESH_MS, VERSION, REPOSITORY_URL } from "../lib/constants.ts";

export default function NavBar() {
  // Update durations every minute
  useEffect(() => {
    const interval = setInterval(() => {
      // This will trigger computed signal updates
      clientStatus.value = { ...clientStatus.value };
    }, UI_REFRESH_MS);

    return () => clearInterval(interval);
  }, []);

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
          {/* GitHub Link */}
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="btn btn-ghost btn-square"
          >
            <img
              class="image-link"
              src="/github.svg"
              alt="GitHub repository"
              width="24"
              height="24"
            />
          </a>

          {/* Navigation Menu */}
          <ul class="menu menu-horizontal px-1 text-xl">
            <li>
              <a
                href="/list"
                class={`btn btn-ghost ${
                  globalThis.location?.pathname === "/list" ? "btn-accent" : ""
                }`}
              >
                Models
              </a>
            </li>
            <li>
              <a
                href="/changes"
                class={`btn btn-ghost ${
                  globalThis.location?.pathname === "/changes" ? "btn-accent" : ""
                }`}
              >
                Changes
              </a>
            </li>
            <li>
              <a href="/rss" class="btn btn-ghost">
                <img class="image-link" src="/rss.svg" alt="RSS Feed" width="12" height="12" />
                RSS
              </a>
            </li>
            <li>
              <a
                href="/removed"
                class={`btn btn-ghost ${
                  globalThis.location?.pathname === "/removed" ? "btn-accent" : ""
                }`}
              >
                Removed
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* Right side - Status information */}
      <div class="navbar-end">
        <div class="hidden lg:flex stats stats-horizontal bg-transparent text-sm">
          <div class="stat px-2">
            <div class="stat-desc">Last DB change</div>
            <div class="stat-value text-warning text-sm">{durations.dbLastChange}</div>
          </div>
          <div class="stat px-2">
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
          <div class="stat px-2">
            <div class="stat-desc">Active models</div>
            <div class="stat-value text-warning text-sm">{lists.models.length}</div>
          </div>
          <div class="stat px-2">
            <div class="stat-desc">Removed models</div>
            <div class="stat-value text-warning text-sm">{lists.removed.length}</div>
          </div>
          <div class="stat px-2">
            <div class="stat-desc">Changes</div>
            <div class="stat-value text-warning text-sm">{lists.changes.length}</div>
            {dbFirstChangeTimestamp && (
              <div class="stat-desc text-xs">
                since {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()}
              </div>
            )}
          </div>
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
