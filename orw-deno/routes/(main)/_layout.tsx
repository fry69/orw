import { define } from "../../utils.ts";
import NavBar from "../../islands/NavBar.tsx";
import DataInitializer from "../../islands/DataInitializer.tsx";

export default define.page((props) => {
  return (
    <DataInitializer initialData={props.state.commonData}>
      <NavBar />
      <div class="main-content">
        <props.Component />
      </div>
    </DataInitializer>
  );
});
