import { useEffect, useState } from "react";
import type { ModelDiff } from "../watch-or";

export const ChangeList: React.FC = () => {
  const [changes, setChanges] = useState<ModelDiff[]>([]);

  useEffect(() => {
    fetch("/api/changes")
      .then((res) => res.json())
      .then((data) => setChanges(data));
  }, []);

  return (
    <div className="change-list">
      {changes.map((change, index) => (
        <div key={index} className="change-entry">
          <h2>Change {index + 1}</h2>
          <p>Model ID: {change.id}</p>
          <p>Timestamp: {change.timestamp.toLocaleString()}</p>
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
