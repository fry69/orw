import { useContext, useEffect, useState } from "react";
import { filterComponentWrapper } from "./FilterComponent";
import { GlobalContext } from "./GlobalState";
import { Link } from "react-router-dom";
import type { ModelDiffClient } from "./client";
import { changeSnippet, dateStringDuration } from "./utils";

export const ChangeList: React.FC = () => {
  const [changes, setChanges] = useState<ModelDiffClient[]>([]);
  const { globalState, setGlobalState } = useContext(GlobalContext);

  const [filterText, setFilterText] = useState("");
  const filteredChanges = changes.filter(
    (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase())
  );

  const filterComponent = filterComponentWrapper(filterText, setFilterText);

  useEffect(() => {
    fetch("/api/changes")
      .then((res) => res.json())
      .then((data) => {
        setChanges(data.data.changes);
        setGlobalState((prevState) => ({
          ...prevState,
          status: data.status,
        }));
      });
  }, [globalState.refreshTrigger]);

  useEffect(() => {
    setGlobalState((prevState) => ({
      ...prevState,
      navBarDynamicElement: filterComponent,
    }));
  }, [filterText]);

  return (
    <div className="change-list">
      {filteredChanges.map((change, index) => (
        <div key={index} className="change-entry">
          <p>
            <Link to={`/${change.type === "removed" ? "removed" : "model"}?id=${change.id}`}>
              <b>{change.id}</b>
            </Link>{" "}
            {change.type} at {dateStringDuration(change.timestamp)}
          </p>
          {changeSnippet(change)}
        </div>
      ))}
    </div>
  );
};
