import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import { durationAgo } from "./utils";
import { DateTime } from "luxon";

export const NavBar: React.FC = () => {
  const { globalState, setGlobalState } = useContext(GlobalContext);
  const [dbLastChangeDuration, setDbLastChangeDuration] = useState("");
  const [apiLastCheckDuration, setApiLastCheckDuration] = useState("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    const updateDurations = () => {
      // Update duration strings
      setDbLastChangeDuration(durationAgo(globalState.status.dbLastChange));
      setApiLastCheckDuration(
        globalState.status.isDevelopment
          ? "[dev mode]"
          : durationAgo(globalState.status.apiLastCheck, true)
      );

      // If last API check is longer than an hour ago, trigger an refresh
      const now = Date.now();
      const oneHourAndOneMinute = 3600_000 + 6_000; // 1 hour + 1 minute in milliseconds
      if (now - new Date(globalState.status.apiLastCheck).getTime() > oneHourAndOneMinute) {
        setGlobalState((prevState) => ({
          ...prevState,
          refreshTrigger: !prevState.refreshTrigger, // This inversion triggers refreshing
        }));
      }
    };

    if (globalState.status.isValid) {
      updateDurations();
      interval = setInterval(updateDurations, 60_000); // Update every minute
    }

    // Clean up the interval when the component is unmounted
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [
    globalState.status.isValid,
    globalState.status.dbLastChange,
    globalState.status.apiLastCheck,
  ]);

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
        <li className="dynamic-element">{globalState.navBarDynamicElement}</li>
        <li className="info-container">
          Last DB change:
          <b className="timestamp dynamic">{dbLastChangeDuration}</b>
          Next API check:
          <b className={globalState.status.apiLastCheckStatus + " timestamp dynamic"}>
            {apiLastCheckDuration}
          </b>
        </li>
        <li className="info-container">
          Active models:
          <b className="timestamp">{globalState.status.dbModelCount}</b>
          Removed models:
          <b className="timestamp">{globalState.status.dbRemovedModelCount}</b>
        </li>
        <li className="info-container gridgap">
          Recorded changes:
          <b className="timestamp rowspan">{globalState.status.dbChangesCount}</b>
          <span>
            (since {DateTime.fromISO(globalState.status.dbfirstChangeTimestamp).toISODate()})
          </span>
        </li>
      </ul>
    </nav>
  );
};
