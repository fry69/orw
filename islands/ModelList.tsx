// islands/ModelList.tsx - Fresh 2 Model List Island
import { useEffect, useState } from "preact/hooks";
import { globalLists } from "../lib/state.ts";
import type { Model } from "../shared/global.ts";

interface ModelListProps {
  removed?: boolean;
}

// Utility functions
const roundKb = (num: number): string => {
  if (num < 1024) {
    return num.toString();
  }
  return `${Math.ceil(num / 1024)}k`;
};

const showPricePerMillion = (floatString: string): string => {
  const cost = Math.round(parseFloat(floatString) * 1_000_000 * 100) / 100;
  return cost > 0 ? "$" + cost.toFixed(2) : "[free]";
};

const durationAgo = (timestamp: string): string => {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return "1 month ago";
  if (diffMonths < 12) return `${diffMonths} months ago`;

  const diffYears = Math.floor(diffDays / 365);
  return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
};

const sortModels = (models: Model[], field: string, direction: "asc" | "desc"): Model[] => {
  return [...models].sort((a, b) => {
    let aValue: string | number | undefined;
    let bValue: string | number | undefined;

    switch (field) {
      case "id":
        aValue = a.id;
        bValue = b.id;
        break;
      case "name":
        aValue = a.name;
        bValue = b.name;
        break;
      case "added_at":
        aValue = a.removed_at || a.added_at || "1970-01-01T00:00:00Z";
        bValue = b.removed_at || b.added_at || "1970-01-01T00:00:00Z";
        break;
      case "context_length":
        aValue = a.context_length;
        bValue = b.context_length;
        break;
      case "pricing":
        aValue = a.pricing.completion;
        bValue = b.pricing.completion;
        break;
      case "max_completion_tokens":
        aValue = a.top_provider.max_completion_tokens ?? 0;
        bValue = b.top_provider.max_completion_tokens ?? 0;
        break;
      case "modality":
        aValue = a.architecture.modality;
        bValue = b.architecture.modality;
        break;
      case "tokenizer":
        aValue = a.architecture.tokenizer;
        bValue = b.architecture.tokenizer;
        break;
      case "instruct_type":
        aValue = a.architecture.instruct_type ?? "";
        bValue = b.architecture.instruct_type ?? "";
        break;
      default:
        return 0;
    }

    // Handle empty values
    if ((aValue === "" || aValue === 0 || !aValue) && (bValue === "" || bValue === 0 || !bValue)) {
      return 0;
    }
    if (aValue === "" || aValue === 0 || !aValue) return 1;
    if (bValue === "" || bValue === 0 || !bValue) return -1;

    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    }

    return direction === "desc" ? comparison * -1 : comparison;
  });
};

export default function ModelList({ removed = false }: ModelListProps) {
  const lists = globalLists.value;
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [filterText, setFilterText] = useState<string>("");
  const [sortField, setSortField] = useState<string>("added_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Update filtered models when lists change or filter changes
  useEffect(() => {
    const models = removed ? lists.removed : lists.models;
    const filtered = filterText
      ? models.filter((model) =>
        model.id.toLowerCase().includes(filterText.toLowerCase()) ||
        model.name.toLowerCase().includes(filterText.toLowerCase())
      )
      : models;

    setFilteredModels(sortModels(filtered, sortField, sortDirection));
  }, [lists, filterText, sortField, sortDirection, removed]);

  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return " ⇅";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  const handleRowClick = (modelId: string) => {
    // For now, just open in a new tab (we'll implement model detail page later)
    globalThis.open(`/model?id=${modelId}`, "_blank");
  };

  return (
    <div class="model-list">
      {removed && (
        <h2 style={{ textAlign: "center", color: "white", marginBottom: "20px" }}>
          Models no longer available on OpenRouter or renamed:
        </h2>
      )}

      {/* Filter input */}
      <div style={{ marginBottom: "20px", textAlign: "center" }}>
        <input
          type="text"
          placeholder="Filter models by ID or name..."
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
      </div>

      <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 250px)", overflowY: "auto" }}>
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            backgroundColor: "#1a1a1a",
            color: "white",
            fontSize: "14px",
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("id")}
              >
                ID{getSortIcon("id")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("name")}
              >
                Name{getSortIcon("name")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("added_at")}
              >
                {removed ? "Removed" : "Added"}
                {getSortIcon("added_at")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "right",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("context_length")}
              >
                Context{getSortIcon("context_length")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "right",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("pricing")}
              >
                Price/MT{getSortIcon("pricing")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "right",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("max_completion_tokens")}
              >
                maxOut{getSortIcon("max_completion_tokens")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("modality")}
              >
                Modality{getSortIcon("modality")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("tokenizer")}
              >
                Tokenizer{getSortIcon("tokenizer")}
              </th>
              <th
                style={{
                  padding: "12px 8px",
                  borderBottom: "2px solid #333",
                  backgroundColor: "#2a2a2a",
                  textAlign: "left",
                  cursor: "pointer",
                  userSelect: "none",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
                onClick={() => handleSort("instruct_type")}
              >
                Instruct{getSortIcon("instruct_type")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((model) => (
              <tr
                key={model.id}
                style={{ cursor: "pointer" }}
                onClick={() => handleRowClick(model.id)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#333")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <td style={{ padding: "8px", borderBottom: "1px solid #333" }}>
                  {model.id}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333" }}>
                  {model.name}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333" }}>
                  {model.removed_at
                    ? durationAgo(model.removed_at)
                    : model.added_at
                    ? durationAgo(model.added_at)
                    : ""}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "right" }}>
                  {roundKb(model.context_length)}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "right" }}>
                  {model.id === "openrouter/auto"
                    ? "[N/A]"
                    : showPricePerMillion(model.pricing.completion)}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333", textAlign: "right" }}>
                  {(() => {
                    const maxOut = model.top_provider.max_completion_tokens ?? 0;
                    return maxOut > 0 ? roundKb(maxOut) : "";
                  })()}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333" }}>
                  {model.architecture.modality}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333" }}>
                  {model.architecture.tokenizer}
                </td>
                <td style={{ padding: "8px", borderBottom: "1px solid #333" }}>
                  {model.architecture.instruct_type ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredModels.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "20px",
              color: "#666",
              fontSize: "16px",
            }}
          >
            No models found
          </div>
        )}
      </div>
    </div>
  );
}
