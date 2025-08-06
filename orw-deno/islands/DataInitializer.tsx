// islands/DataInitializer.tsx - Initialize global state with server data
import { useEffect } from "preact/hooks";
import { clientConfig, clientLists, clientStatus, currentRoute } from "../lib/state.ts";
import type { AppConfig, Lists, WatcherStatus } from "../lib/types.ts";
import { WATCHER_INTERVAL_MS } from "../lib/constants.ts";

interface DataInitializerProps {
  initialData?: {
    config: AppConfig;
    status: WatcherStatus;
    lists: Lists;
    pathname: string;
  };
  children: preact.ComponentChildren;
}

export default function DataInitializer(
  { initialData, children }: DataInitializerProps,
): preact.ComponentChildren {
  useEffect(() => {
    if (initialData) {
      // Initialize client state with server-rendered data
      clientConfig.value = initialData.config;
      clientStatus.value = initialData.status;
      clientLists.value = initialData.lists;
      currentRoute.value = initialData.pathname;

      // Set up auto-refresh timer
      const apiLastCheck = new Date(initialData.status.apiLastCheck);
      const timeSinceLastCheck = Date.now() - apiLastCheck.getTime();
      const timeUntilNextCheck = WATCHER_INTERVAL_MS - timeSinceLastCheck;

      // Add 1 minute buffer to ensure new data is available
      const timeUntilRefresh = timeUntilNextCheck + 60_000; // 1 minute buffer

      if (timeUntilRefresh > 0) {
        // console.log(`Auto-refresh scheduled in ${Math.round(timeUntilRefresh / 60_000)} minutes`);

        const timeout = setTimeout(() => {
          // console.log("Auto-refreshing page to get latest data...");
          globalThis.location.reload();
        }, timeUntilRefresh);

        return () => clearTimeout(timeout);
      }
    }
  }, [initialData]);

  return <>{children}</>;
}
