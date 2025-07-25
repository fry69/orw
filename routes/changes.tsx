// routes/changes.tsx - Changes page
import type { PageProps } from "fresh";
import NavBar from "../islands/NavBar.tsx";
import DataUpdater from "../islands/DataUpdater.tsx";
import ChangeList from "../islands/ChangeList.tsx";
import ErrorContainer from "../components/ErrorContainer.tsx";

export default function ChangesPage(_props: PageProps) {
  return (
    <>
      <DataUpdater />
      <NavBar />
      <div class="main-content">
        <ErrorContainer>
          <ChangeList />
        </ErrorContainer>
      </div>
    </>
  );
}
