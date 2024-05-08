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
        <li className="timestamp">
          DB last change:{" "}
          <b style={{ color: "skyblue" }}>
            {durationAgo(globalState.dbLastChange)}
          </b>{" "}
          API last check:{" "}
          <b style={{ color: "skyblue" }}>
            {durationAgo(globalState.apiLastCheck)}
          </b>
        </li>
      </ul>
    </nav>
  );
};
