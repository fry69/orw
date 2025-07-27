// routes/removed.tsx - Removed models page (Fresh 2 with server-side data loading)
import { define } from "../lib/app.ts";
import NavBar from "../islands/NavBar.tsx";
import ModelList from "../islands/ModelList.tsx";
import ErrorContainer from "../components/ErrorContainer.tsx";
import DataInitializer from "../islands/DataInitializer.tsx";

export default define.page((props) => {
  return (
    <>
      <DataInitializer initialData={props.state.commonData} />
      <NavBar />
      <div class="main-content">
        <ErrorContainer>
          <ModelList removed />
        </ErrorContainer>
      </div>
    </>
  );
});
