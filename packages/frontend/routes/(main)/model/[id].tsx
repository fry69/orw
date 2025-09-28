// routes/model/[id].tsx - Model detail page
import { define } from "../../../utils.ts";
import ModelDetail from "../../../islands/ModelDetail.tsx";

export default define.page((props) => {
  const encodedModelId = props.params.id;
  const modelId = decodeURIComponent(encodedModelId);

  return <ModelDetail modelId={modelId} />;
});
