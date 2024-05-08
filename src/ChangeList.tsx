import { useContext, useEffect, useMemo, useState } from "react";
import { FilterComponent } from "./FilterComponent";
import { GlobalContext } from "./GlobalState";
import { Link } from "react-router-dom";
import type { ModelDiffClient } from "./types";
import { dateString, dateStringDuration } from "./utils";
import type { ChangesResponse } from "../types";

export const ChangeList: React.FC = () => {
  const [changes, setChanges] = useState<ModelDiffClient[]>([]);
  const { setGlobalState } = useContext(GlobalContext);

  const [filterText, setFilterText] = useState("");
  const filteredChanges = changes.filter(
    (item) =>
      item.id && item.id.toLowerCase().includes(filterText.toLowerCase())
  );

  const filterComponentMemo = useMemo(() => {
    const handleClear = () => {
      if (filterText) {
        setFilterText("");
      }
    };

    return (
      <FilterComponent
        onFilter={(e: any) => setFilterText(e.target.value)}
        onClear={handleClear}
        filterText={filterText}
        onKeydown={(e: any) => {
          if (e.key === "Escape") {
            e.target.blur();
            handleClear();
          }
        }}
      />
    );
  }, [filterText]);

  useEffect(() => {
    fetch("/api/changes")
      .then((res) => res.json())
      .then((data) => {
        setChanges(data.data.changes);
        setGlobalState((prevState) => ({
          ...prevState,
          apiLastCheck: data.apiLastCheck,
          dbLastChange: data.dbLastChange,
        }));
      });
  }, []);

  useEffect(() => {
    setGlobalState((prevState) => ({
      ...prevState,
      navBarDynamicElement: filterComponentMemo,
    }));
  }, [filterText]);

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
          {Object.entries(change.changes).map(
            ([key, { old, new: newValue }]) => (
              <p key={key}>
                {key}: {old} → {newValue}
              </p>
            )
          )}
        </div>
      ))}
    </div>
  );
};
