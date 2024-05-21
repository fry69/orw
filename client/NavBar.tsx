import React, { useContext, useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import { DateTime } from "luxon";
import { VERSION, APIVersion } from "../version";

export const NavBar: React.FC = () => {
  const { globalStatus, globalData, globalClient } =
    useContext(GlobalContext);

  let dbfirstChangeTimestamp: string = globalData.changes.at(-1)?.timestamp ?? "";

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
          <b className="timestamp dynamic">{globalClient.navBarDurations.dbLastChange}</b>
          Next API check:
          <b className={globalStatus.apiLastCheckStatus + " timestamp dynamic"}>
            {globalClient.navBarDurations.apiLastCheck}
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
        <li className="info-container single-column">
          Version: <b>{VERSION}</b>
        </li>
      </ul>
    </nav>
  );
};
