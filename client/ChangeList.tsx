import { useContext, useEffect, useCallback, useState, type FC } from "react";
import { FilterComponent } from "./FilterComponent";
import { GlobalContext } from "./GlobalState";
import { Link } from "react-router-dom";
import { dateStringDuration } from "./utils";
import { ChangeSnippet } from "./ChangeSnippet";
import type { ModelDiff } from "../global";

export const ChangeList: FC = () => {
  const { globalLists, setGlobalClient } = useContext(GlobalContext);
  const [filteredChanges, setFilteredChanges] = useState<ModelDiff[]>([]);

  const filterChanges = useCallback((filterText: string) =>
      setFilteredChanges(
        globalLists.changes.filter(
          (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase())
        )
      ),
    [globalLists.changes]
  );

  useEffect(() => {
    setGlobalClient((prevState) => ({
      ...prevState,
      navBarDynamicElement: <FilterComponent filter={filterChanges} />,
    }));
  }, [filterChanges]);

  return (
    <div className="change-list">
      {filteredChanges.map((change, index) => (
        <div key={index} className="change-entry">
          <p>
            <Link to={`/model?id=${change.id}`}>
              <b>{change.id}</b>
            </Link>{" "}
            {change.type} at {dateStringDuration(change.timestamp)}
          </p>
          <ChangeSnippet change={change} hideTypes={["removed"]} />
        </div>
      ))}
    </div>
  );
};
