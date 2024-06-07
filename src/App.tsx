// client/App.tsx
import type { FC, ReactNode } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { NavBar } from "./NavBar";
import { ModelDetail } from "./ModelDetail";
import { ChangeList } from "./ChangeList";
import { ModelList } from "./ModelList";
import { GlobalProvider } from "./GlobalState";
import { ErrorContainer } from "./ErrorContainer";
import { Brain } from "./Brain";

/**
 * The main application component.
 * @returns - The main application component.
 */
const App: FC = (): ReactNode => {
  return (
    <GlobalProvider>
      <Brain />
      <div className="content-container">
        <NavBar />
        <div className="main-content">
          <ErrorContainer>
            <Routes>
              <Route path="/list" element={<ModelList />} />
              <Route path="/removed" element={<ModelList removed />} />
              <Route path="/model" element={<ModelDetail />} />
              <Route path="/changes" element={<ChangeList />} />
              <Route path="/" element={<Navigate to="/changes" replace />} />
            </Routes>
          </ErrorContainer>
        </div>
      </div>
    </GlobalProvider>
  );
};

export default App;
