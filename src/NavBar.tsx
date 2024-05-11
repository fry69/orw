import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { GlobalContext } from "./GlobalState";
import { durationAgo } from "./utils";

export const NavBar: React.FC = () => {
  const { globalState } = useContext(GlobalContext);

  return (
    <nav>
      <ul>
        <li>
          <NavLink
            to="/list"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Model List
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/changes"
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            Change List
          </NavLink>
        </li>
        <li className="dynamic-element">{globalState.navBarDynamicElement}</li>
        <li className="info-container">
          <span>
            (<NavLink to="/removed">removed</NavLink>) Models:
          </span>
          <span className="timestamp">
            <b>
              ({globalState.status.dbRemovedModelCount}){" "}
              {globalState.status.dbModelCount}
            </b>
          </span>
          Changes:
          <span className="timestamp">
            <b>{globalState.status.dbChangesCount}</b>
          </span>
        </li>
        <li className="info-container">
          DB last change:
          <span className="timestamp">
            <b>{durationAgo(globalState.status.dbLastChange)}</b>
          </span>
          API last check:
          <span className="timestamp">
            <b>
              {globalState.status.isDevelopment
                ? "[dev mode]"
                : durationAgo(globalState.status.apiLastCheck)}
            </b>
          </span>
        </li>
        <li>
          <a
            href="https://github.com/fry69/watch-or"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
          >
            <img
              src="https://github.com/fluidicon.png"
              alt="GitHub"
              width="32"
              height="32"
            />
          </a>
        </li>
      </ul>
    </nav>
  );
};
