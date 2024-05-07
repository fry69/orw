import { useContext, useEffect, useMemo, useState } from "react";
import type { ModelDiff } from "../watch-or";
import { FilterComponent } from "./FilterComponent";
import { DynamicElementContext } from "./App";

export const ChangeList: React.FC = () => {
  const [changes, setChanges] = useState<ModelDiff[]>([]);
  const { setDynamicElement } = useContext(DynamicElementContext);

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
      .then((data) => setChanges(data));
  }, []);

  setDynamicElement(filterComponentMemo);

  return (
    <div className="change-list">
      {filteredChanges.map((change, index) => (
        <div key={index} className="change-entry">
          <p>Changes for <b>{change.id}</b> at <b>{change.timestamp.toString()}</b></p>
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
