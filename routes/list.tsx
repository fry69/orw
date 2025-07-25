// routes/list.tsx - Model list page
import type { PageProps } from "fresh";
import NavBar from "../islands/NavBar.tsx";
import DataUpdater from "../islands/DataUpdater.tsx";
import ModelList from "../islands/ModelList.tsx";
import ErrorContainer from "../components/ErrorContainer.tsx";

export default function ListPage(_props: PageProps) {
  return (
    <>
      <DataUpdater />
      <NavBar />
      <div class="main-content">
        <ErrorContainer>
          <ModelList />
        </ErrorContainer>
      </div>
    </>
  );
}
