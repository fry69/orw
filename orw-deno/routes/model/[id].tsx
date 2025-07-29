// routes/model/[id].tsx - Model detail page
import { define } from "../../utils.ts";
import NavBar from "../../islands/NavBar.tsx";
import ModelDetail from "../../islands/ModelDetail.tsx";
import DataInitializer from "../../islands/DataInitializer.tsx";

export default define.page((props) => {
  const encodedModelId = props.params.id;
  const modelId = decodeURIComponent(encodedModelId);

  return (
    <>
      <DataInitializer initialData={props.state.commonData} />
      <NavBar />
      <div class="main-content">
        <ModelDetail modelId={modelId} />
      </div>
    </>
  );
});
