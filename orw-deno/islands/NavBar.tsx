// islands/NavBar.tsx - Navigation bar with real-time updates
import { useEffect } from "preact/hooks";
import { clientConfig, clientLists, clientStatus, navBarDurations } from "../lib/state.ts";
import { UI_REFRESH_MS } from "../lib/constants.ts";
import { GitHubIcon } from "../components/Icons.tsx";
import NavLinks from "../components/navbar/NavLinks.tsx";
import StatusInfo from "../components/navbar/StatusInfo.tsx";
import Filter from "../components/navbar/Filter.tsx";
import ChangesToggle from "./ChangesToggle.tsx";

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
    <div class="navbar bg-base-300 px-4 min-h-18">
      {/* Left side - GitHub link and navigation */}
      <div class="navbar-start">
        <div class="flex items-center gap-2">
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
          <NavLinks />
        </div>
      </div>

      {/* Center - Filter input and Changes toggle */}
      <div class="navbar-center">
        <div class="flex items-center gap-4">
          <Filter />
          <ChangesToggle />
        </div>
      </div>

      {/* Right side - Status information */}
      <div class="navbar-end">
        <StatusInfo
          status={status}
          lists={lists}
          durations={durations}
          dbFirstChangeTimestamp={dbFirstChangeTimestamp}
        />
      </div>
    </div>
  );
}
