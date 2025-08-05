// routes/list.tsx - Model list page (Fresh 2 with server-side data loading)
import { define } from "../../utils.ts";
import ModelList from "../../islands/ModelList.tsx";

export default define.page(() => {
  return <ModelList />;
});
