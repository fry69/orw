import { type FC, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FilterComponent } from "./FilterComponent.tsx";
import { GlobalContext } from "./GlobalState.tsx";
import { dateStringDuration } from "./utils.tsx";
import { ChangeSnippet } from "./ChangeSnippet.tsx";
import type { ModelDiff } from "../shared/global.ts";

/**
 * A component that displays a list of recorded changes.
 * @returns - A component that displays a list of recorded changes.
 */
export const ChangeList: FC = (): ReactNode => {
  const { globalLists, globalClient } = useContext(GlobalContext);
  const [filteredChanges, setFilteredChanges] = useState<ModelDiff[]>([]);

  const filterChanges = useCallback(
    (filterText: string) =>
      setFilteredChanges(
        globalLists.state.changes.filter(
          (item: ModelDiff) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase()),
        ),
      ),
    [globalLists.state.changes],
  );

  useEffect(() => {
    globalClient.setState((prevState: any) => ({
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
