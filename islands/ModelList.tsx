// islands/ModelList.tsx - Interactive model list with search and sorting
import { useEffect, useState } from "preact/hooks";
import { clientLists } from "../lib/state.ts";
import type { Model } from "../lib/types.ts";

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
  const lists = clientLists.value;
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
    <div class="container mx-auto px-4 py-6">
      {removed && (
        <div class="alert alert-info mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            class="stroke-current shrink-0 w-6 h-6"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            >
            </path>
          </svg>
          <span>Models no longer available on OpenRouter or renamed</span>
        </div>
      )}

      {/* Filter input */}
      <div class="form-control w-full max-w-xs mx-auto mb-6">
        <input
          type="text"
          placeholder="Filter models by ID or name..."
          value={filterText}
          onInput={(e) => setFilterText((e.target as HTMLInputElement).value)}
          class="input input-bordered w-full"
        />
      </div>

      <div class="overflow-x-auto">
        <table class="table table-zebra table-pin-rows w-full">
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
              <th
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
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredModels.map((model) => (
              <tr
                key={model.id}
                class="hover cursor-pointer"
                onClick={() => handleRowClick(model.id)}
              >
                <td>
                  <span class="model-id">{model.id}</span>
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
                    class={`badge badge-sm ${
                      model.id === "openrouter/auto" ? "badge-ghost" : "badge-info"
                    }`}
                  >
                    {model.id === "openrouter/auto"
                      ? "[N/A]"
                      : showPricePerMillion(model.pricing.completion)}
                  </span>
                </td>
                <td class="text-right">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredModels.length === 0 && (
          <div class="text-center py-10">
            <div class="text-lg text-base-content/50">No models found</div>
          </div>
        )}
      </div>
    </div>
  );
}
