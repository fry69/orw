import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import { durationAgo } from "./utils";
import { DateTime } from "luxon";
import { APIVersion } from "../version";
import type { APIResponseClient as APIResponse } from "./client";

export const NavBar: React.FC = () => {
  const { globalStatus, setGlobalStatus, globalData, setGlobalData, globalClient, setError } =
    useContext(GlobalContext);
  const [dbLastChangeDuration, setDbLastChangeDuration] = useState("");
  const [apiLastCheckDuration, setApiLastCheckDuration] = useState("");
  const [startIntervalTrigger, setStartIntervalTrigger] = useState(false);

  let dbfirstChangeTimestamp: string = globalData.changes.at(-1)?.timestamp ?? "";

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
      setDbLastChangeDuration(durationAgo(localStatus.dbLastChange));
      setApiLastCheckDuration(
        localStatus.isDevelopment ? "[dev mode]" : durationAgo(localStatus.apiLastCheck, true)
      );
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

  return (
    <nav>
      <ul>
        <li className="github-link">
          <a
            href="https://github.com/fry69/orw"
            target="_blank"
            rel="noopener noreferrer"
            className="button-link"
          >
            <img
              className="image-link"
              src="/github.svg"
              alt="GitHub repository"
              width="32"
              height="32"
            />
          </a>
        </li>
        <li>
          <NavLink to="/list" className={({ isActive }) => (isActive ? "active" : "")}>
            Models
          </NavLink>
        </li>
        <li className="changes-container">
          <NavLink to="/changes" className={({ isActive }) => (isActive ? "active" : "")}>
            Changes
          </NavLink>
          <a href="/rss" className="button-link rss-link">
            <img className="image-link" src="/rss.svg" alt="RSS Feeed" width="16" height="16" />
          </a>
        </li>
        <li className="dynamic-element">{globalClient.navBarDynamicElement}</li>
        <li className="info-container">
          Last DB change:
          <b className="timestamp dynamic">{dbLastChangeDuration}</b>
          Next API check:
          <b className={globalStatus.apiLastCheckStatus + " timestamp dynamic"}>
            {apiLastCheckDuration}
          </b>
        </li>
        <li className="info-container">
          Active models:
          <b className="timestamp">{globalData.models.length}</b>
          Removed models:
          <b className="timestamp">{globalData.removed.length}</b>
        </li>
        <li className="info-container gridgap">
          Recorded changes:
          <b className="timestamp rowspan">{globalData.changes.length}</b>
          <span>(since {DateTime.fromISO(dbfirstChangeTimestamp ?? "").toISODate()})</span>
        </li>
      </ul>
    </nav>
  );
};
