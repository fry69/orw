// islands/ChangeList.tsx - Interactive change history list
import { useEffect, useState } from "preact/hooks";
import { filteredChanges } from "../lib/state.ts";
import type { ModelDiff } from "../lib/types.ts";
import { formatNumber, showPricePerMillion } from "../lib/utils.ts";

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

/**
 * Formats a single change value for display with human-readable formatting
 */
const formatChangeValue = (value: unknown, path: string): string => {
  if (value === null) return "[null]";
  if (value === undefined) return "[undefined]";

  // Handle pricing fields with proper formatting
  if (path.includes("pricing.")) {
    if (typeof value === "string") {
      return `${showPricePerMillion(value)} per million tokens`;
    }
  }

  // Handle numbers with locale formatting
  if (typeof value === "number") {
    return formatNumber(value);
  }

  // Handle arrays
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[${value.join(", ")}]`;
  }

  // Default: JSON stringify but without quotes for simple values
  if (typeof value === "string") return value;
  return JSON.stringify(value);
};

/**
 * Calculates percentage change for numeric values
 */
const calculatePercentageChange = (oldVal: unknown, newVal: unknown): string => {
  if (typeof oldVal !== "number" || typeof newVal !== "number") return "";
  if (oldVal === 0) return "";

  const change = ((newVal - oldVal) / oldVal) * 100;
  const sign = change >= 0 ? "+" : "";
  return ` (${sign}${Math.round(change)}%)`;
};

const ChangeSnippet = ({ change }: { change: ModelDiff }) => {
  if (!change.changes || Object.keys(change.changes).length === 0) {
    return <div class="text-base-content/50 italic">No detailed changes recorded</div>;
  }

  const changeEntries = Object.entries(change.changes);

  return (
    <div class="mt-2 text-xs text-base-content/70">
      {changeEntries.slice(0, 3).map(([path, changeItem], index) => {
        const oldFormatted = formatChangeValue(changeItem.old, path);
        const newFormatted = formatChangeValue(changeItem.new, path);

        // Calculate percentage change for pricing fields
        let percentageChange = "";
        if (
          path.includes("pricing.") && typeof changeItem.old === "string" &&
          typeof changeItem.new === "string"
        ) {
          const oldPrice = parseFloat(changeItem.old);
          const newPrice = parseFloat(changeItem.new);
          if (!isNaN(oldPrice) && !isNaN(newPrice)) {
            percentageChange = calculatePercentageChange(oldPrice, newPrice);
          }
        }

        return (
          <div key={index} class="mb-1">
            <span class="text-success font-bold">{path}</span>:
            <span class="text-error ml-1">{oldFormatted}</span>
            <span class="mx-1">→</span>
            <span class="text-info">{newFormatted}</span>
            {percentageChange && <span class="text-warning font-semibold">{percentageChange}</span>}
          </div>
        );
      })}
      {changeEntries.length > 3 && (
        <div class="text-base-content/40 italic">
          ... and {changeEntries.length - 3} more changes
        </div>
      )}
    </div>
  );
};

export default function ChangeList() {
  // Use shared filter signal instead of local state
  const baseChanges = filteredChanges.value;
  const [sortedChanges, setSortedChanges] = useState<ModelDiff[]>([]);
  // const [limit, setLimit] = useState<number>(500);
  const limit = 500;

  // Update sorted changes when filter changes
  useEffect(() => {
    // Apply limit and sort by timestamp (newest first)
    const sorted = baseChanges
      .sort((a: ModelDiff, b: ModelDiff) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
      .slice(0, limit);

    setSortedChanges(sorted);
  }, [baseChanges, limit]);

  const handleRowClick = (changeId: string) => {
    // Navigate to model detail page (URL encode to handle slashes in model IDs)
    if (changeId) {
      globalThis.location.href = `/model/${encodeURIComponent(changeId)}`;
    }
  };

  const getChangeTypeBadge = (type: string) => {
    switch (type) {
      case "added":
        return "badge-success";
      case "removed":
        return "badge-error";
      case "modified":
        return "badge-warning";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div class="container mx-auto px-4 py-6">
      {/* Filter input removed - now in NavBar */}

      <div class="space-y-4">
        {sortedChanges.map((change, index) => (
          <div
            key={`${change.id}-${change.timestamp}-${index}`}
            class={`card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow duration-200 ${
              change.id ? "cursor-pointer hover:bg-base-200" : ""
            }`}
            onClick={() => change.id && handleRowClick(change.id)}
          >
            <div class="card-body">
              <div class="flex justify-between items-start mb-2">
                <div>
                  <h3 class={`card-title text-lg ${change.id ? "link" : ""}`}>
                    {change.id || "Unknown Model"}
                  </h3>
                  <div class={`badge ${getChangeTypeBadge(change.type)} badge-sm mt-1`}>
                    {change.type.toUpperCase()}
                  </div>
                </div>
                <div class="text-right text-sm text-base-content/70">
                  <div>{formatDateTime(change.timestamp)}</div>
                  <div class="font-bold text-warning">{durationAgo(change.timestamp)}</div>
                </div>
              </div>

              <ChangeSnippet change={change} />
            </div>
          </div>
        ))}

        {sortedChanges.length === 0 && (
          <div class="text-center py-10">
            <div class="text-lg text-base-content/50">No changes found</div>
          </div>
        )}
      </div>
    </div>
  );
}
