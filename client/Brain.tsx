import { useContext, useEffect, useRef, useState, type FC } from "react";
import { GlobalContext } from "./GlobalState";
import type { APIResponse } from "../global";
import {
  API__LISTS,
  API__STATUS,
  API_VERSION,
  FETCH_TIMEOUT,
  VERSION,
  INITIAL_INTERVAL,
  REFRESH_INTERVAL,
} from "../constants";
import { durationAgo } from "./utils";

let updateInterval = INITIAL_INTERVAL; // Current update interval, adjustable for soft error backoff

// Fake fetch function for testing error conditions
// const fail = async (ignore: any) => {
//   await new Promise((resolve) => setTimeout(resolve, 1_000)); // 1 sec delay to not fail too fast repeatedly
//   return new Response(null, { status: 200 });
// };

export const Brain: FC = () => {
  const { globalStatus, setGlobalStatus, setGlobalLists, setGlobalClient, setError } =
    useContext(GlobalContext);
  const [startIntervalTrigger, setStartIntervalTrigger] = useState(false);
  const errorCount = useRef(0);

  const errorHandler = (message: string) => {
    setError(message, true);
    console.error(message);
    errorCount.current++;
    updateInterval *= 2; // Double interval with every error
  };

  const fetchAPI = async (endpoint: string): Promise<APIResponse> => {
    try {
      // const response = await fail(endpoint);
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT),
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
      // If we made it here, everythings seems fine, let's clear any existing error
      setError();
      // Reset updateInterval and error count
      updateInterval = INITIAL_INTERVAL;
      errorCount.current = 0;
      return apiResponse;
    } catch (err) {
      errorHandler(`API failed to load, try #${errorCount.current + 1}: ${err}`);
    }
    return { version: -1 };
  };

  useEffect(() => {
    // On first mount, load all API data unconditionally
    const loadAPI = async () => {
      const { lists } = await fetchAPI(API__LISTS);
      if (lists) {
        setGlobalLists(() => lists);
      }
      const { status } = await fetchAPI(API__STATUS);
      if (status) {
        setGlobalStatus(() => status);
      }
    };

    loadAPI()
      .then(() => setStartIntervalTrigger(true))
      .catch((err) => {
        errorHandler(`Error loading data from API: ${err}`);
      });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let localStatus = globalStatus;

    const updateDuration = () => {
      // Update duration strings
      setGlobalClient((prevState) => ({
        ...prevState,
        navBarDurations: {
          dbLastChange: durationAgo(localStatus.dbLastChange),
          apiLastCheck: localStatus.isDevelopment
            ? "[dev mode]"
            : durationAgo(localStatus.apiLastCheck, true),
        },
      }));
    };

    const handleRefresh = async () => {
      try {
        const prevDbTimestamp = new Date(localStatus.dbLastChange).getTime();
        let apiResponse: APIResponse = await fetchAPI(API__STATUS);
        const status = apiResponse.status;
        if (status) {
          setGlobalStatus(() => status);
          localStatus = status;
          const newDbTimestamp = new Date(status.dbLastChange).getTime();
          // Only load data from the API when database has changed
          if (newDbTimestamp > prevDbTimestamp) {
            apiResponse = await fetchAPI(API__LISTS);
            const lists = apiResponse.lists;
            if (lists) {
              setGlobalLists(() => lists);
            }
          }
        }
      } catch (err) {
        errorHandler(`Error reloading data from API: ${err}`);
      }
      if (interval) {
        // After doubling interval 5 times (> 1h), let's hard refresh the browser window
        if (errorCount.current > 5) {
          // A clear error message is better than a stale client
          console.log("Giving up retrying after 5 times, refreshing window");
          window.location.reload();
        }
        clearInterval(interval); // Kill existing interval
        updateDuration(); // Show new duration immediately because interval starts with delay
        interval = setInterval(updateLoop, updateInterval); // Restart update with current interval
      }
    };

    const updateLoop = () => {
      updateDuration();
      // If last API check is longer than an hour ago, check for new data, trigger a refresh if needed
      const now = Date.now();
      if (now - new Date(localStatus.apiLastCheck).getTime() > REFRESH_INTERVAL) {
        handleRefresh().catch((err) => {
          errorHandler(`Error trying to reload data from API: ${err}`);
        });
      }
    };

    // Start the 60 second update interval if API data is valid, otherwise load data from API
    if (localStatus.isValid && !interval) {
      updateDuration(); // Immediate call to update duration strings because interval starts with delay
      interval = setInterval(updateLoop, updateInterval); // Start interval
    }

    // Clean up the interval when the component is unmounted
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [startIntervalTrigger]);

  return <></>;
};
