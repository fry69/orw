// islands/DataUpdater.tsx - Background data polling (replaces Brain.tsx logic)
import { useEffect, useRef } from "preact/hooks";
import { globalLists, globalStatus, setGlobalError } from "../lib/state.ts";
import {
  API_VERSION,
  FETCH_TIMEOUT_MS,
  INITIAL_INTERVAL_MS,
  REFRESH_INTERVAL_MS,
  VERSION,
} from "../lib/constants.ts";
import type { APIResponse } from "../types/global.ts";

let updateInterval = INITIAL_INTERVAL_MS;

export default function DataUpdater() {
  const errorCount = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const errorHandler = (message: string) => {
    setGlobalError(message, true);
    console.error(message);
    errorCount.current++;
    updateInterval *= 2; // Double interval with every error
  };

  const fetchAPI = async (endpoint: string): Promise<APIResponse> => {
    try {
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "X-ORW-Version": VERSION,
        },
      });

      if (!response.ok) {
        throw `Unsuccessful response status ${response.status} received`;
      }

      const responseText = await response.text();
      if (responseText.length === 0) {
        throw "Empty response";
      }

      const apiResponse: APIResponse = JSON.parse(responseText);
      if (!apiResponse || Object.keys(apiResponse).length === 0) {
        throw "No JSON data received";
      }

      if (apiResponse.version !== API_VERSION) {
        throw "Version mismatch: Please try reloading, clear caches, etc.";
      }

      // Clear any existing error
      setGlobalError();
      // Reset updateInterval and error count
      updateInterval = INITIAL_INTERVAL_MS;
      errorCount.current = 0;

      return apiResponse;
    } catch (err) {
      errorHandler(`API failed to load, try #${errorCount.current + 1}: ${err}`);
      return { version: -1 };
    }
  };

  const loadInitialData = async () => {
    try {
      const [listsResponse, statusResponse] = await Promise.all([
        fetchAPI("/api/lists"),
        fetchAPI("/api/status"),
      ]);

      if (listsResponse.lists) {
        globalLists.value = listsResponse.lists;
      }
      if (statusResponse.status) {
        globalStatus.value = statusResponse.status;
      }
    } catch (err) {
      errorHandler(`Error loading initial data: ${err}`);
    }
  };

  const handleRefresh = async () => {
    try {
      const prevDbTimestamp = new Date(globalStatus.value.dbLastChange).getTime();
      const statusResponse = await fetchAPI("/api/status");

      if (statusResponse.status) {
        globalStatus.value = statusResponse.status;
        const newDbTimestamp = new Date(statusResponse.status.dbLastChange).getTime();

        // Only load data when database has changed
        if (newDbTimestamp > prevDbTimestamp) {
          const listsResponse = await fetchAPI("/api/lists");
          if (listsResponse.lists) {
            globalLists.value = listsResponse.lists;
          }
        }
      }
    } catch (err) {
      errorHandler(`Error refreshing data: ${err}`);
    }

    // Handle error recovery
    if (errorCount.current > 5) {
      console.log("Giving up retrying after 5 times, refreshing window");
      globalThis.location?.reload();
    }
  };

  const updateLoop = () => {
    const now = Date.now();
    const lastCheck = new Date(globalStatus.value.apiLastCheck).getTime();

    // If last API check is longer than an hour ago, refresh
    if (now - lastCheck > REFRESH_INTERVAL_MS) {
      handleRefresh().catch((err) => {
        errorHandler(`Error in update loop: ${err}`);
      });
    }
  };

  useEffect(() => {
    // Load initial data
    loadInitialData();

    // Start update interval
    intervalRef.current = setInterval(updateLoop, updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // This island is invisible - it just manages data updates
  return null;
}
