// client/App.tsx
import React from "react";
import { Route, Routes, NavLink, useLocation } from "react-router-dom";
import "./nav.css";
import { ModelDetail } from "./ModelDetail";
import { ChangeList } from "./ChangeList";
import { ModelList } from "./ModelList";

const App: React.FC = () => {
  const location = useLocation();
  const isModelDetailsActive = location.pathname.startsWith("/model");
  const modelId = new URLSearchParams(location.search).get("id");

  return (
    <div className="content-container">
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
          {isModelDetailsActive && modelId && (
            <li className="model-id">Model ID: {modelId}</li>
          )}
        </ul>
      </nav>

      <Routes>
        <Route path="/model" element={<ModelDetail />} />
        <Route path="/changes" element={<ChangeList />} />
        <Route path="/" element={<ModelList />} />
      </Routes>
    </div>
  );
};

export default App;
