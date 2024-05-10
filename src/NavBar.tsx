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
            to="/"
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
          <span>(<NavLink to="/removed">removed</NavLink>) Models:</span>
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
            <b>{durationAgo(globalState.status.apiLastCheck)}</b>
          </span>
        </li>
      </ul>
    </nav>
  );
};
