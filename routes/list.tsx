// routes/list.tsx - Model list page (converted from ModelList component)
import type { PageProps } from "fresh";
import NavBar from "../islands/NavBar.tsx";
import DataUpdater from "../islands/DataUpdater.tsx";
import ErrorContainer from "../components/ErrorContainer.tsx";

export default function ListPage(_props: PageProps) {
  return (
    <>
      <DataUpdater />
      <NavBar />
      <div class="main-content">
        <ErrorContainer>
          <h1>OpenRouter Models</h1>
          <p>Fresh 2 migration is in progress. This page will show the model list.</p>
          <p>
            The real model list will be implemented as an Island component with filtering and sorting.
          </p>
        </ErrorContainer>
      </div>
    </>
  );
}
