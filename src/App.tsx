// client/App.tsx
import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Link, Routes } from "react-router-dom";
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
    <div>
      <h1>Model List</h1>
      <ul>
        {models.map((model) => (
          <li key={model.id}>
            <Link to={`/model?id=${model.id}`}>{model.name}</Link>
          </li>
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

  return (
    <div>
      <h1>{model.name}</h1>
      <p>{model.description}</p>
      <h2>Changes</h2>
      {changes.map((change, index) => (
        <div key={index}>
          <h3>Change {index + 1}</h3>
          <p>Timestamp: {change.timestamp.toLocaleString()}</p>
          {Object.entries(change.changes).map(([key, { old, new: newValue }]) => (
            <p key={key}>
              {key}: {old} → {newValue}
            </p>
          ))}
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
    <div>
      <h1>Change List</h1>
      {changes.map((change, index) => (
        <div key={index}>
          <h2>Change {index + 1}</h2>
          <p>Model ID: {change.id}</p>
          <p>Timestamp: {change.timestamp.toLocaleString()}</p>
          {Object.entries(change.changes).map(([key, { old, new: newValue }]) => (
            <p key={key}>
              {key}: {old} → {newValue}
            </p>
          ))}
        </div>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li>
              <Link to="/">Model List</Link>
            </li>
            <li>
              <Link to="/changes">Change List</Link>
            </li>
          </ul>
        </nav>

        <Routes>
          <Route path="/model" element={<ModelDetails />} />
          <Route path="/changes" element={<ChangeList />} />
          <Route path="/" element={<ModelList />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;