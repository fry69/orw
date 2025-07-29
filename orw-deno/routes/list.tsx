// routes/list.tsx - Model list page (Fresh 2 with server-side data loading)
import { define } from "../utils.ts";
import NavBar from "../islands/NavBar.tsx";
import ModelList from "../islands/ModelList.tsx";
import DataInitializer from "../islands/DataInitializer.tsx";

export default define.page((props) => {
  return (
    <>
      <DataInitializer initialData={props.state.commonData} />
      <NavBar />
      <div class="main-content">
        <ModelList />
      </div>
    </>
  );
});
