// client/App.tsx
import React, { createContext, useState } from "react";
import { Route, Routes } from "react-router-dom";
import "./app-dark.css";
import { NavBar } from "./NavBar";
import { ModelDetail } from "./ModelDetail";
import { ChangeList } from "./ChangeList";
import { ModelList } from "./ModelList";

export const DynamicElementContext = createContext({
  dynamicElement: null as React.ReactNode,
  setDynamicElement: (value: React.ReactNode) => {},
});

const App: React.FC = () => {
  const [dynamicElement, setDynamicElement] = useState<React.ReactNode>(null);

  return (
    <DynamicElementContext.Provider
      value={{ dynamicElement, setDynamicElement }}
    >
      <div className="content-container">
        <NavBar />
        <div className="main-content">
          <Routes>
            <Route path="/model" element={<ModelDetail />} />
            <Route path="/changes" element={<ChangeList />} />
            <Route path="/" element={<ModelList />} />
          </Routes>
        </div>
      </div>
    </DynamicElementContext.Provider>
  );
};

export default App;
