import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import { durationAgo } from "./utils";

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
          : durationAgo(globalState.status.apiLastCheck)
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

    // Start the interval after a short delay (e.g., 1 second)
    // to account for globalState not being initialised from the API yet
    const delayedStart = setTimeout(() => {
      updateDurations();
      interval = setInterval(updateDurations, 60_000); // Update every minute
    }, 1_000);

    // Clean up the interval when the component is unmounted
    return () => {
      clearTimeout(delayedStart);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [globalState.status.dbLastChange, globalState.status.apiLastCheck]);

  return (
    <nav>
      <ul>
        <li>
          <NavLink to="/list" className={({ isActive }) => (isActive ? "active" : "")}>
            Model List
          </NavLink>
        </li>
        <li className="changes-container">
          <NavLink to="/changes" className={({ isActive }) => (isActive ? "active" : "")}>
            Change List
          </NavLink>
          <a href="/rss" className="button-link rss-link">
            <img className="image-link" src="/rss.svg" alt="RSS Feeed" width="16" height="16" />
          </a>
        </li>
        <li className="info-container">
          Recorded changes:
          <b className="timestamp">{globalState.status.dbChangesCount}</b>
        </li>
        <li className="dynamic-element">{globalState.navBarDynamicElement}</li>
        <li className="info-container">
          Active models:
          <b className="timestamp">{globalState.status.dbModelCount}</b>
          Removed models:
          <b className="timestamp">{globalState.status.dbRemovedModelCount}</b>
        </li>
        <li className="info-container">
          DB last change:
          <b className="timestamp">{dbLastChangeDuration}</b>
          API last check:
          <b className="timestamp">{apiLastCheckDuration}</b>
        </li>
        <li>
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
      </ul>
    </nav>
  );
};
