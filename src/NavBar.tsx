import React, { useContext } from "react";
import { NavLink } from "react-router-dom";
import { DynamicElementContext } from "./App";

export const NavBar: React.FC = () => {
  const { dynamicElement } = useContext(DynamicElementContext);

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
        <li className="dynamic-element">{dynamicElement}</li>
      </ul>
    </nav>
  );
};
