// client/App.tsx
import type { FC, ReactNode } from "react";
import { Route, Routes, Navigate } from "react-router-dom";
import { NavBar } from "./NavBar.tsx";
import { ModelDetail } from "./ModelDetail.tsx";
import { ChangeList } from "./ChangeList.tsx";
import { ModelList } from "./ModelList.tsx";
import { GlobalProvider } from "./GlobalState.tsx";
import { ErrorContainer } from "./ErrorContainer.tsx";
import { Brain } from "./Brain.tsx";

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
