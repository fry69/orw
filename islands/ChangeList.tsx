// islands/ChangeList.tsx - Interactive change history list
import { useEffect, useState } from "preact/hooks";
import { clientLists } from "../lib/state.ts";
import type { ModelDiff } from "../types/global.ts";

const durationAgo = (timestamp: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
};

const formatDateTime = (timestamp: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleString();
};

const ChangeSnippet = ({ change }: { change: ModelDiff }) => {
  if (!change.changes || Object.keys(change.changes).length === 0) {
    return <div style={{ color: "#888", fontStyle: "italic" }}>No detailed changes recorded</div>;
  }

  const changeEntries = Object.entries(change.changes);

  return (
    <div style={{ marginTop: "8px", fontSize: "12px", color: "#ccc" }}>
      {changeEntries.slice(0, 3).map(([path, changeItem], index) => (
        <div key={index} style={{ marginBottom: "4px" }}>
          <strong>{path}</strong>:
          <span style={{ color: "#ff9999" }}>{JSON.stringify(changeItem.old)}</span>
          <span>→</span>
          <span style={{ color: "#99ff99" }}>{JSON.stringify(changeItem.new)}</span>
        </div>
      ))}
      {changeEntries.length > 3 && (
        <div style={{ color: "#666", fontStyle: "italic" }}>
          ... and {changeEntries.length - 3} more changes
        </div>
      )}
    </div>
  );
};

export default function ChangeList() {
  const lists = clientLists.value;
  const [filteredChanges, setFilteredChanges] = useState<ModelDiff[]>([]);
  const [filterText, setFilterText] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);

  // Update filtered changes when lists change or filter changes
  useEffect(() => {
    let filtered = lists.changes;

    if (filterText) {
      filtered = filtered.filter((change) =>
        change.id?.toLowerCase().includes(filterText.toLowerCase()) ||
        change.type?.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // Apply limit and sort by timestamp (newest first)
    filtered = filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);

    setFilteredChanges(filtered);
  }, [lists.changes, filterText, limit]);

  const handleRowClick = (changeId: string) => {
    // For now, just open model detail in a new tab
    if (changeId) {
      globalThis.open(`/model?id=${changeId}`, "_blank");
    }
  };

  const getChangeTypeColor = (type: string) => {
    switch (type) {
      case "added":
        return "#99ff99";
      case "removed":
        return "#ff9999";
      case "modified":
        return "#ffff99";
      default:
        return "#ccc";
    }
  };

  return (
    <div class="change-list">
      <h1 style={{ color: "white", marginBottom: "20px" }}>OpenRouter Model Changes</h1>

      {/* Controls */}
      <div
        style={{
          marginBottom: "20px",
          display: "flex",
          gap: "20px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <input
          type="text"
          placeholder="Filter changes by model ID or type..."
          value={filterText}
          onInput={(e) => setFilterText((e.target as HTMLInputElement).value)}
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            borderRadius: "4px",
            border: "1px solid #333",
            backgroundColor: "#2a2a2a",
            color: "white",
            width: "300px",
          }}
        />
        <select
          value={limit}
          onChange={(e) => setLimit(parseInt((e.target as HTMLSelectElement).value))}
          style={{
            padding: "8px 12px",
            fontSize: "14px",
            borderRadius: "4px",
            border: "1px solid #333",
            backgroundColor: "#2a2a2a",
            color: "white",
          }}
        >
          <option value={25}>Show 25</option>
          <option value={50}>Show 50</option>
          <option value={100}>Show 100</option>
          <option value={200}>Show 200</option>
        </select>
      </div>

      <div style={{ overflowY: "auto", maxHeight: "calc(100vh - 250px)" }}>
        {filteredChanges.map((change, index) => (
          <div
            key={`${change.id}-${change.timestamp}-${index}`}
            style={{
              backgroundColor: "#1a1a1a",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "16px",
              marginBottom: "12px",
              cursor: change.id ? "pointer" : "default",
            }}
            onClick={() => change.id && handleRowClick(change.id)}
            onMouseEnter={(e) => {
              if (change.id) {
                e.currentTarget.style.backgroundColor = "#2a2a2a";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#1a1a1a";
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: "8px",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    color: "white",
                    fontSize: "16px",
                    textDecoration: change.id ? "underline" : "none",
                  }}
                >
                  {change.id || "Unknown Model"}
                </h3>
                <div
                  style={{
                    color: getChangeTypeColor(change.type),
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    fontSize: "12px",
                    marginTop: "4px",
                  }}
                >
                  {change.type}
                </div>
              </div>
              <div style={{ textAlign: "right", color: "#999", fontSize: "12px" }}>
                <div>{formatDateTime(change.timestamp)}</div>
                <div style={{ fontWeight: "bold" }}>{durationAgo(change.timestamp)}</div>
              </div>
            </div>

            <ChangeSnippet change={change} />
          </div>
        ))}

        {filteredChanges.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#666",
              fontSize: "16px",
            }}
          >
            No changes found
          </div>
        )}
      </div>

      {lists.changes.length > 0 && (
        <div
          style={{
            textAlign: "center",
            marginTop: "20px",
            color: "#999",
            fontSize: "14px",
          }}
        >
          Showing {filteredChanges.length} of {lists.changes.length} total changes
        </div>
      )}
    </div>
  );
}
