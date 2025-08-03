// islands/ModelList.tsx - Interactive model list with search and sorting
import { useEffect, useState } from "preact/hooks";
import { filteredModels, filteredRemovedModels } from "../lib/state.ts";
import type { Model } from "../lib/types.ts";
import { durationAgo, showPricePerMillion } from "../lib/utils.ts";
import { InfoIcon } from "../components/Icons.tsx";

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
        // aValue = a.pricing.completion;
        // bValue = b.pricing.completion;
        aValue = a.id === "openrouter/auto"
          ? Number.MAX_SAFE_INTEGER.toString()
          : a.pricing.completion;
        bValue = b.id === "openrouter/auto"
          ? Number.MAX_SAFE_INTEGER.toString()
          : b.pricing.completion;
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
  // Use shared filter signals instead of local state
  const baseModels = removed ? filteredRemovedModels.value : filteredModels.value;
  const [sortedModels, setSortedModels] = useState<Model[]>([]);
  const [sortField, setSortField] = useState<string>("added_at");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Update sorted models when filter or sort changes
  useEffect(() => {
    setSortedModels(sortModels(baseModels, sortField, sortDirection));
  }, [baseModels, sortField, sortDirection]);

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

  const handleRowClick = (e: MouseEvent) => {
    // Navigate to model detail page
    const link = (e.currentTarget as HTMLElement).querySelector("a");
    if (link) {
      link.click();
    }
  };

  return (
    <div class="container mx-auto px-4 py-6">
      {removed && (
        <div class="alert alert-info mb-6">
          <InfoIcon />
          <span>Models no longer available on OpenRouter or renamed</span>
        </div>
      )}

      {/* Filter input removed - now in NavBar */}

      <div class="overflow-x-auto">
        <table class="table">
          <thead>
            <tr class="bg-base-300">
              <th
                class="cursor-pointer select-none hover:bg-base-200"
                onClick={() => handleSort("id")}
              >
                ID{getSortIcon("id")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200"
                onClick={() => handleSort("name")}
              >
                Name{getSortIcon("name")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200"
                onClick={() => handleSort("added_at")}
              >
                {removed ? "Removed" : "Added"}
                {getSortIcon("added_at")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200 text-right"
                onClick={() => handleSort("context_length")}
              >
                Context{getSortIcon("context_length")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200 text-right"
                onClick={() => handleSort("pricing")}
              >
                Price/MT{getSortIcon("pricing")}
              </th>
              {
                /* <th
                class="cursor-pointer select-none hover:bg-base-200 text-right"
                onClick={() => handleSort("max_completion_tokens")}
              >
                maxOut{getSortIcon("max_completion_tokens")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200"
                onClick={() => handleSort("modality")}
              >
                Modality{getSortIcon("modality")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200"
                onClick={() => handleSort("tokenizer")}
              >
                Tokenizer{getSortIcon("tokenizer")}
              </th>
              <th
                class="cursor-pointer select-none hover:bg-base-200"
                onClick={() => handleSort("instruct_type")}
              >
                Instruct{getSortIcon("instruct_type")}
              </th> */
              }
            </tr>
          </thead>
          <tbody>
            {sortedModels.map((model, index) => (
              <tr
                key={`${model.id}-${index}`}
                class="hover:bg-base-300"
                onClick={handleRowClick}
              >
                <td>
                  <a class="model-id" href={`/model/${encodeURIComponent(model.id)}`}>
                    {model.id}
                  </a>
                </td>
                <td class="font-medium">{model.name}</td>
                <td>
                  <span class="text-warning">
                    {model.removed_at
                      ? durationAgo(model.removed_at)
                      : model.added_at
                      ? durationAgo(model.added_at)
                      : ""}
                  </span>
                </td>
                <td class="text-right">
                  <span class="badge badge-neutral badge-sm">
                    {roundKb(model.context_length)}
                  </span>
                </td>
                <td class="text-right">
                  <span
                    class={model.pricing.completion === "0" ? "text-primary" : "text-info"}
                  >
                    {model.id === "openrouter/auto"
                      ? "[N/A]"
                      : showPricePerMillion(model.pricing.completion)}
                  </span>
                </td>
                {
                  /* <td class="text-right">
                  {(() => {
                    const maxOut = model.top_provider.max_completion_tokens ?? 0;
                    return maxOut > 0
                      ? <span class="badge badge-neutral badge-sm">{roundKb(maxOut)}</span>
                      : "";
                  })()}
                </td>
                <td>
                  <span class="badge badge-primary badge-sm">
                    {model.architecture.modality}
                  </span>
                </td>
                <td>
                  <span class="badge badge-secondary badge-sm">
                    {model.architecture.tokenizer}
                  </span>
                </td>
                <td>
                  {model.architecture.instruct_type && (
                    <span class="badge badge-accent badge-sm">
                      {model.architecture.instruct_type}
                    </span>
                  )}
                </td> */
                }
              </tr>
            ))}
          </tbody>
        </table>

        {sortedModels.length === 0 && (
          <div class="text-center py-10">
            <div class="text-lg text-base-content/50">No models found</div>
          </div>
        )}
      </div>
    </div>
  );
}
