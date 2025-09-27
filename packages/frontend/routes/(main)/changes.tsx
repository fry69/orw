// routes/changes.tsx - Changes page (Fresh 2 with server-side data loading)
import { define } from "../../utils.ts";
import ChangeList from "../../islands/ChangeList.tsx";

export default define.page(() => {
  return <ChangeList />;
});
