import React, { useContext, useEffect, useState } from "react";
import { GlobalContext } from "./GlobalState";
import type { APIResponse } from "../global";
import { APIVersion } from "../version";
import { durationAgo } from "./utils";

export const Brain: React.FC = () => {
  const { globalStatus, setGlobalStatus, setGlobalData, setGlobalClient, setError } =
    useContext(GlobalContext);
  const [startIntervalTrigger, setStartIntervalTrigger] = useState(false);

  const fetchAPI = async (endpoint: string): Promise<APIResponse> => {
    try {
      const response = await fetch(endpoint);
      const data: APIResponse = await response.json();
      if (!data) {
        throw "No data received from API";
      }
      if (data.version !== APIVersion) {
        throw "API version mismatch: Please try reloading, clear caches, etc.";
      }
      return data;
    } catch (err: any) {
      setError(err ?? "API error", true);
      console.error(err);
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
        setError(err ?? "Error loading data from API", true);
        console.error(err);
      });
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let localStatus = globalStatus;

    const handleHardRefresh = async () => {
      // Only load data from the API when database has changed
      try {
        const prevDbTimestamp = new Date(globalStatus.dbLastChange).getTime();
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
        setError(err ?? "Error reloading data from API", true);
        console.error(err);
      }
      if (interval) {
        clearInterval(interval); // Kill existing interval
        updateLoop(); // Show new duration immediately because interval starts with delay
        interval = setInterval(updateLoop, 60_000); // Restart update every minute
      }
    };

    const updateLoop = () => {
      // Update duration strings
      setGlobalClient((prevState) => ({
        ...prevState,
        navBarDurations: {
          dbLastChange: durationAgo(localStatus.dbLastChange),
          apiLastCheck: localStatus.isDevelopment ? "[dev mode]" : durationAgo(localStatus.apiLastCheck, true),
        }
       }));
      // If last API check is longer than an hour ago, check for new data, trigger a refresh if needed
      const now = Date.now();
      const oneHourAndOneMinute = 3600_000 + 60_000; // 1 hour + 1 minute in milliseconds
      if (now - new Date(localStatus.apiLastCheck).getTime() > oneHourAndOneMinute) {
        handleHardRefresh().catch(console.error);
      }
    };

    // Start the 60 second update interval if API data is valid, otherwise load data from API
    if (localStatus.isValid && !interval) {
      updateLoop(); // Immediate call to update duration strings because interval starts with delay
      interval = setInterval(updateLoop, 60_000); // Update every minute
    }

    // Clean up the interval when the component is unmounted
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [startIntervalTrigger]);


  return <></>
}