// client/App.tsx
import React from "react";
import { Route, Routes, Navigate } from "react-router-dom";
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
            <Route path="/list" element={<ModelList />} />
            <Route path="/removed" element={<ModelList removed />} />
            <Route path="/model" element={<ModelDetail />} />
            <Route path="/changes" element={<ChangeList />} />
            <Route path="/" element={<Navigate to="/list" replace />} />
          </Routes>
        </div>
      </div>
    </GlobalProvider>
  );
};

export default App;
