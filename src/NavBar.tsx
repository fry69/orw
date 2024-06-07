import { ReactNode, useContext, type FC } from "react";
import { NavLink } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import { DateTime } from "luxon";
import { VERSION } from "../shared/constants";

/**
 * NavBar component displays the navigation bar of the application.
 * It includes links to the GitHub repository, models, changes, and RSS feed.
 * It also displays information about the last database change, active models,
 * removed models, recorded changes, and the version of the application.
 * @returns The NavBar component.
 */
export const NavBar: FC = (): ReactNode => {
  const { globalStatus, globalLists, globalClient } = useContext(GlobalContext);

  /**
   * The timestamp of the last change in the database.
   */
  const dbfirstChangeTimestamp: string = globalLists.state.changes.at(-1)?.timestamp ?? "";

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
        <li className="dynamic-element">{globalClient.state.navBarDynamicElement}</li>
        <li className="info-container">
          Last DB change:
          <b className="timestamp dynamic">{globalClient.state.navBarDurations.dbLastChange}</b>
          Next API check:
          <b className={globalStatus.state.apiLastCheckStatus + " timestamp dynamic"}>
            {globalClient.state.navBarDurations.apiLastCheck}
          </b>
        </li>
        <li className="info-container">
          Active models:
          <b className="timestamp">{globalLists.state.models.length}</b>
          Removed models:
          <b className="timestamp">{globalLists.state.removed.length}</b>
        </li>
        <li className="info-container gridgap">
          Recorded changes:
          <b className="timestamp rowspan">{globalLists.state.changes.length}</b>
          <span>(since {DateTime.fromISO(dbfirstChangeTimestamp ?? "").toISODate()})</span>
        </li>
        <li className="info-container single-column">
          Version: <b>{VERSION}</b>
        </li>
      </ul>
    </nav>
  );
};
