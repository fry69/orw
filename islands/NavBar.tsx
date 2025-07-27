// islands/NavBar.tsx - Navigation bar with real-time updates
import { useEffect } from "preact/hooks";
import { clientLists, clientStatus, navBarDurations } from "../lib/state.ts";
import { DateTime } from "luxon";
import { UI_REFRESH_MS, VERSION } from "../lib/constants.ts";

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
    <nav>
      <ul>
        <li class="github-link">
          <a
            href="https://github.com/fry69/orw"
            target="_blank"
            rel="noopener noreferrer"
            class="button-link"
          >
            <img
              class="image-link"
              src="/github.svg"
              alt="GitHub repository"
              width="32"
              height="32"
            />
          </a>
        </li>
        <li>
          <a
            href="/list"
            class={globalThis.location?.pathname === "/list" ? "active" : ""}
          >
            Models
          </a>
        </li>
        <li class="changes-container">
          <a
            href="/changes"
            class={globalThis.location?.pathname === "/changes" ? "active" : ""}
          >
            Changes
          </a>
          <a href="/rss" class="button-link rss-link">
            <img class="image-link" src="/rss.svg" alt="RSS Feed" width="16" height="16" />
          </a>
        </li>
        <li class="info-container">
          Last DB change:
          <b class="timestamp dynamic">{durations.dbLastChange}</b>
          Next API check:
          <b class={`${status.apiLastCheckStatus} timestamp dynamic`}>
            {durations.apiLastCheck}
          </b>
        </li>
        <li class="info-container">
          Active models:
          <b class="timestamp">{lists.models.length}</b>
          Removed models:
          <b class="timestamp">{lists.removed.length}</b>
        </li>
        <li class="info-container gridgap">
          Recorded changes:
          <b class="timestamp rowspan">{lists.changes.length}</b>
          {dbFirstChangeTimestamp && (
            <span>(since {DateTime.fromISO(dbFirstChangeTimestamp).toISODate()})</span>
          )}
        </li>
        <li class="info-container single-column">
          Version: <b>{VERSION}</b>
        </li>
      </ul>
    </nav>
  );
}
