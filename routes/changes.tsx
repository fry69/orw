// routes/changes.tsx - Changes page (converted from ChangeList component)
import type { PageProps } from "fresh";
import NavBar from "../islands/NavBar.tsx";
import DataUpdater from "../islands/DataUpdater.tsx";
import ErrorContainer from "../components/ErrorContainer.tsx";

export default function ChangesPage(_props: PageProps) {
  return (
    <>
      <DataUpdater />
      <NavBar />
      <div class="main-content">
        <ErrorContainer>
          <h1>OpenRouter Model Changes</h1>
          <p>Fresh 2 migration is in progress. This page will show model changes.</p>
          <p>The real change list will be implemented as an Island component with real-time updates.</p>
        </ErrorContainer>
      </div>
    </>
  );
}
