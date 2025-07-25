import { type FC, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Model } from "../shared/global.ts";
import { GlobalContext } from "./GlobalState.tsx";
import { durationAgo, showPricePerMillion } from "./utils.tsx";
import { FilterComponent } from "./FilterComponent.tsx";

/**
 * Rounds a number to the nearest kilobyte (kB) if it's greater than or equal to 1024.
 * @param num - The number to round.
 * @returns - The rounded number as a string with 'k' suffix if it's greater than or equal to 1024, otherwise the original number.
 */
const roundKb = (num: number): string => {
  if (num < 1024) {
    return num.toString();
  }
  return `${Math.ceil(num / 1024)}k`;
};

/**
 * Sort models by a specific field
 */
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
    if (aValue === "" || aValue === 0 || !aValue) {
      return 1;
    }
    if (bValue === "" || bValue === 0 || !bValue) {
      return -1;
    }

    let comparison = 0;
    if (typeof aValue === "string" && typeof bValue === "string") {
      comparison = aValue.toLowerCase().localeCompare(bValue.toLowerCase());
    } else if (typeof aValue === "number" && typeof bValue === "number") {
      comparison = aValue - bValue;
    }

    return direction === "desc" ? comparison * -1 : comparison;
  });
};

/**
 * Propertiess for the ModelList component.
 */
export interface ModelListProps {
  /** A flag to indicate whether to display removed models instead. */
  removed?: boolean;
}

/**
 * A functional component that displays a list of models in a DataTable.
 * @param props - The properties passed to the component.
 * @returns - The ReactNode representing the ModelList component.
 */
export const ModelList: FC<ModelListProps> = ({ removed }: ModelListProps): ReactNode => {
  const navigate = useNavigate();
  const { globalLists, globalClient } = useContext(GlobalContext);
  const [filteredModels, setFilteredModels] = useState<Model[]>([]);
  const [sortField, setSortField] = useState<string>("added_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  /**
   * A callback function that filters the models based on the provided filter text.
   * @param filterText - The text to filter the models by.
   */
  const filterModels = useCallback(
    (filterText: string) => {
      const models = removed
        ? globalLists.state.removed.filter(
          (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase()),
        )
        : globalLists.state.models.filter(
          (item) => item.id && item.id.toLowerCase().includes(filterText.toLowerCase()),
        );

      setFilteredModels(sortModels(models, sortField, sortDirection));
    },
    [removed, globalLists.state.models, globalLists.state.removed, sortField, sortDirection],
  );

  /**
   * Handle column header click for sorting
   */
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  /**
   * Update sorted models when sort parameters change
   */
  useEffect(() => {
    setFilteredModels((prev) => sortModels(prev, sortField, sortDirection));
  }, [sortField, sortDirection]);

  /**
   * A useEffect hook that updates the navBarDynamicElement in the globalClient state.
   * It sets the FilterComponent as the dynamic element, passing the filterModels function as a prop.
   */
  useEffect(() => {
    globalClient.setState((prevState) => ({
      ...prevState,
      navBarDynamicElement: <FilterComponent filter={filterModels} />,
    }));
  }, [filterModels]);

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    backgroundColor: "#1a1a1a",
    color: "white",
    fontSize: "14px",
  };

  const thStyle: React.CSSProperties = {
    padding: "12px 8px",
    borderBottom: "2px solid #333",
    backgroundColor: "#2a2a2a",
    textAlign: "left",
    cursor: "pointer",
    userSelect: "none",
    position: "sticky",
    top: 0,
    zIndex: 1,
  };

  const tdStyle: React.CSSProperties = {
    padding: "8px",
    borderBottom: "1px solid #333",
  };

  const rowStyle: React.CSSProperties = {
    cursor: "pointer",
  };

  const rightAlignStyle: React.CSSProperties = {
    textAlign: "right",
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return " ⇅";
    return sortDirection === "asc" ? " ↑" : " ↓";
  };

  return (
    <>
      {removed && (
        <h2 style={{ textAlign: "center", color: "white", marginBottom: "20px" }}>
          Models no longer available on OpenRouter or renamed:
        </h2>
      )}

      <div style={{ overflowX: "auto", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
        <table style={tableStyle}>
          <thead>
            <tr>
              <th style={thStyle} onClick={() => handleSort("id")}>
                ID{getSortIcon("id")}
              </th>
              <th style={thStyle} onClick={() => handleSort("name")}>
                Name{getSortIcon("name")}
              </th>
              <th style={thStyle} onClick={() => handleSort("added_at")}>
                {removed ? "Removed" : "Added"}
                {getSortIcon("added_at")}
              </th>
              <th
                style={{ ...thStyle, ...rightAlignStyle }}
                onClick={() => handleSort("context_length")}
              >
                Context{getSortIcon("context_length")}
              </th>
              <th style={{ ...thStyle, ...rightAlignStyle }} onClick={() => handleSort("pricing")}>
                Price/MT{getSortIcon("pricing")}
              </th>
              <th
                style={{ ...thStyle, ...rightAlignStyle }}
                onClick={() => handleSort("max_completion_tokens")}
              >
                maxOut{getSortIcon("max_completion_tokens")}
              </th>
              <th style={thStyle} onClick={() => handleSort("modality")}>
                Modality{getSortIcon("modality")}
              </th>
              <th style={thStyle} onClick={() => handleSort("tokenizer")}>
                Tokenizer{getSortIcon("tokenizer")}
              </th>
              <th style={thStyle} onClick={() => handleSort("instruct_type")}>
                Instruct{getSortIcon("instruct_type")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((model) => (
              <tr
                key={model.id}
                style={rowStyle}
                onClick={() => navigate(`/model?id=${model.id}`)}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#333"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
              >
                <td style={tdStyle}>{model.id}</td>
                <td style={tdStyle}>{model.name}</td>
                <td style={tdStyle}>
                  {model.removed_at
                    ? durationAgo(model.removed_at)
                    : model.added_at
                    ? durationAgo(model.added_at)
                    : ""}
                </td>
                <td style={{ ...tdStyle, ...rightAlignStyle }}>
                  {roundKb(model.context_length)}
                </td>
                <td style={{ ...tdStyle, ...rightAlignStyle }}>
                  {model.id === "openrouter/auto"
                    ? "[N/A]"
                    : showPricePerMillion(model.pricing.completion)}
                </td>
                <td style={{ ...tdStyle, ...rightAlignStyle }}>
                  {(() => {
                    const maxOut = model.top_provider.max_completion_tokens ?? 0;
                    return maxOut > 0 ? roundKb(maxOut) : "";
                  })()}
                </td>
                <td style={tdStyle}>{model.architecture.modality}</td>
                <td style={tdStyle}>{model.architecture.tokenizer}</td>
                <td style={tdStyle}>{model.architecture.instruct_type ?? ""}</td>
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
    </>
  );
};
