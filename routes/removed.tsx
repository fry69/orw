// routes/removed.tsx - Removed models page
import type { PageProps } from "fresh";
import NavBar from "../islands/NavBar.tsx";
import DataUpdater from "../islands/DataUpdater.tsx";
import ErrorContainer from "../components/ErrorContainer.tsx";

export default function RemovedPage(_props: PageProps) {
  return (
    <>
      <DataUpdater />
      <NavBar />
      <div class="main-content">
        <ErrorContainer>
          <h1>Removed OpenRouter Models</h1>
          <p>Fresh 2 migration is in progress. This page will show removed models.</p>
          <p>This will be the same ModelList Island but with removed=true prop.</p>
        </ErrorContainer>
      </div>
    </>
  );
}
