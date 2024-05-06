// client/App.tsx
import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Link,
  Routes,
  NavLink,
  useLocation,
} from "react-router-dom";
import type { Model, ModelDiff } from "../watch-or";
import "./nav.css";

const ModelList: React.FC = () => {
  const [models, setModels] = useState<Model[]>([]);

  useEffect(() => {
    fetch("/api/models")
      .then((res) => res.json())
      .then((data) => setModels(data));
  }, []);

  return (
    <div className="model-list">
      <ul>
        {models.map((model) => (
          <Link key={model.id} to={`/model?id=${model.id}`}>
            <li className="model-list-item">
              <span>{model.id}</span>
            </li>
          </Link>
        ))}
      </ul>
    </div>
  );
};

const ModelDetails: React.FC = () => {
  const [model, setModel] = useState<Model | null>(null);
  const [changes, setChanges] = useState<ModelDiff[]>([]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");
    if (id) {
      fetch(`/api/model?id=${id}`)
        .then((res) => res.json())
        .then(({ model, changes }) => {
          setModel(model);
          setChanges(changes);
        });
    }
  }, []);

  if (!model) {
    return <div>Loading...</div>;
  }

  // Create a new object that excludes the 'description' property
  const modelDetails: any = { ...model };
  delete modelDetails.description;

  return (
    <div className="model-details">
      <h2>{model.name}</h2>
      <h3>Description</h3>
      <pre>{model.description}</pre>
      <h3>Model Details</h3>
      <pre>{JSON.stringify(modelDetails, null, 2)}</pre>
      <h3>Changes</h3>
      {changes.map((change, index) => (
        <div key={index}>
          <h3>Change {index + 1}</h3>
          <p>Timestamp: {change.timestamp.toLocaleString()}</p>
          {Object.entries(change.changes).map(
            ([key, { old, new: newValue }]) => (
              <p key={key}>
                {key}: {old} → {newValue}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
};

const ChangeList: React.FC = () => {
  const [changes, setChanges] = useState<ModelDiff[]>([]);

  useEffect(() => {
    fetch("/api/changes")
      .then((res) => res.json())
      .then((data) => setChanges(data));
  }, []);

  return (
    <div className="change-list">
      {changes.map((change, index) => (
        <div key={index} className="change-entry">
          <h2>Change {index + 1}</h2>
          <p>Model ID: {change.id}</p>
          <p>Timestamp: {change.timestamp.toLocaleString()}</p>
          {Object.entries(change.changes).map(
            ([key, { old, new: newValue }]) => (
              <p key={key}>
                {key}: {old} → {newValue}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
};

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
        <Route path="/model" element={<ModelDetails />} />
        <Route path="/changes" element={<ChangeList />} />
        <Route path="/" element={<ModelList />} />
      </Routes>
    </div>
  );
};

export default App;
