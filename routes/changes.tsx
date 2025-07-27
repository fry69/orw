// routes/changes.tsx - Changes page (Fresh 2 with server-side data loading)
import { define } from "../lib/app.ts";
import NavBar from "../islands/NavBar.tsx";
import ChangeList from "../islands/ChangeList.tsx";
import DataInitializer from "../islands/DataInitializer.tsx";

export default define.page((props) => {
  return (
    <>
      <DataInitializer initialData={props.state.commonData} />
      <NavBar />
      <div class="main-content">
        <ChangeList />
      </div>
    </>
  );
});
