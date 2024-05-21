import { useContext, useEffect, useRef, useState, type FC } from "react";
import { GlobalContext } from "./GlobalState";
import type { APIResponse } from "../global";
import { APIVersion } from "../version";
import { durationAgo } from "./utils";

const initialUpdateInterval = 60_000; // One minute in milliseconds
const refreshInterval = 3600_000 + 60_000; // One hour and one minute in milliseconds

// Values for testing during development
// const initialUpdateInterval = 5_000; // Five seconds in milliseconds
// const refreshInterval = 10_000; // Ten seconds in milliseconds

let updateInterval = initialUpdateInterval; // Current update interval, adjustable for soft error backoff

// Fake fetch function for testing error conditions
// const fail = async (ignore: any) => {
//   await new Promise((resolve) => setTimeout(resolve, 1_000)); // 1 sec delay to not fail too fast repeatedly
//   return new Response(null, { status: 200 });
// };

export const Brain: FC = () => {
  const { globalStatus, setGlobalStatus, setGlobalData, setGlobalClient, setError } =
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
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw `Unsuccessful response status ${response.status} received`;
      }
      const responseText = await response.text();
      if (responseText.length === 0) {
        throw "Empty response";
      }
      const data: APIResponse = JSON.parse(responseText);
      if (!data || Object.keys(data).length === 0) {
        throw "No JSON data received";
      }
      if (data.version !== APIVersion) {
        throw "Version mismatch: Please try reloading, clear caches, etc.";
      }
      // If we made it here, everythings seems fine, let's clear any existing error
      setError();
      // Reset updateInterval and error count
      updateInterval = initialUpdateInterval;
      errorCount.current = 0;
      return data;
    } catch (err) {
      errorHandler(`API failed to load (${err})`);
    }
    return { version: -1 };
  };

  useEffect(() => {
    // On first mount, load all API data unconditionally
    const loadAPI = async () => {
      const { data } = await fetchAPI("/api/data");
      if (data) {
        setGlobalData(() => data);
      }
      const { status } = await fetchAPI("/api/status");
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
      // Only load data from the API when database has changed
      try {
        const prevDbTimestamp = new Date(localStatus.dbLastChange).getTime();
        const { status } = await fetchAPI("/api/status");
        if (status) {
          setGlobalStatus(() => status);
          localStatus = status;
          const newDbTimestamp = new Date(status.dbLastChange).getTime();
          if (newDbTimestamp > prevDbTimestamp) {
            const { data } = await fetchAPI("/api/data");
            if (data) {
              setGlobalData(() => data);
            }
          }
        }
      } catch (err: any) {
        errorHandler(`Error reloading data from API: ${err}`);
      }
      if (interval) {
        // After doubling interval 5 times (153 min), let's hard refresh the browser window
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
      if (now - new Date(localStatus.apiLastCheck).getTime() > refreshInterval) {
        handleRefresh().catch((err: any) => {
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
