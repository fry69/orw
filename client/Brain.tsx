import { useContext, useEffect, useState, type FC } from "react";
import { GlobalContext } from "./GlobalState";
import type { APIResponse } from "../global";
import { APIVersion } from "../version";
import { durationAgo } from "./utils";

const updateInterval = 60_000; // One minute in milliseconds
const refreshInterval = 3600_000 + 60_000; // One hour and one minute in milliseconds

// const fail = async (ignore: any) => {
//   await new Promise((resolve) => setTimeout(resolve, 1_000)); // 1 sec
//   return new Response(null, { status: 200 });
// };

export const Brain: FC = () => {
  const { globalStatus, setGlobalStatus, setGlobalData, setGlobalClient, setError } =
    useContext(GlobalContext);
  const [startIntervalTrigger, setStartIntervalTrigger] = useState(false);

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
      return data;
    } catch (err) {
      const errorMessage = `API failed to load, please try again in a few minutes (${err})`;
      setError(errorMessage, true);
      console.error(errorMessage);
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
        const errorMessage = `Error loading data from API: ${err}`;
        setError(errorMessage, true);
        console.error(errorMessage);
      });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let localStatus = globalStatus;

    const handleHardRefresh = async () => {
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
        const errorMessage = `Error reloading data from API: ${err}`;
        setError(errorMessage, true);
        console.error(errorMessage);
      }
      if (interval) {
        clearInterval(interval); // Kill existing interval
        updateLoop(); // Show new duration immediately because interval starts with delay
        interval = setInterval(updateLoop, updateInterval); // Restart update every minute
      }
    };

    const updateLoop = () => {
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
      // If last API check is longer than an hour ago, check for new data, trigger a refresh if needed
      const now = Date.now();
      if (now - new Date(localStatus.apiLastCheck).getTime() > refreshInterval) {
        handleHardRefresh().catch((err: any) => {
          const errorMessage = `Error trying to reload data from API: ${err}`;
          setError(errorMessage, true);
          console.error(errorMessage);
        });
      }
    };

    // Start the 60 second update interval if API data is valid, otherwise load data from API
    if (localStatus.isValid && !interval) {
      updateLoop(); // Immediate call to update duration strings because interval starts with delay
      interval = setInterval(updateLoop, updateInterval); // Update every minute
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
