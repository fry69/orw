// client/App.tsx
import React from "react";
import { Route, Routes } from "react-router-dom";
import "./app-dark.css";
import { NavBar } from "./NavBar";
import { ModelDetail } from "./ModelDetail";
import { ChangeList } from "./ChangeList";
import { ModelList } from "./ModelList";
import { GlobalProvider } from "./GlobalState";

const App: React.FC = () => {
  return (
    <GlobalProvider>
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
    </GlobalProvider>
  );
};

export default App;
