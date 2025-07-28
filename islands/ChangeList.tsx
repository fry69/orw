// islands/ChangeList.tsx - Interactive change history list
import { useEffect, useState } from "preact/hooks";
import { clientLists } from "../lib/state.ts";
import type { ModelDiff } from "../lib/types.ts";

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
    return <div class="text-base-content/50 italic">No detailed changes recorded</div>;
  }

  const changeEntries = Object.entries(change.changes);

  return (
    <div class="mt-2 text-xs text-base-content/70">
      {changeEntries.slice(0, 3).map(([path, changeItem], index) => (
        <div key={index} class="mb-1">
          <span class="font-bold">{path}</span>:
          <span class="text-error ml-1">{JSON.stringify(changeItem.old)}</span>
          <span class="mx-1">→</span>
          <span class="text-success">{JSON.stringify(changeItem.new)}</span>
        </div>
      ))}
      {changeEntries.length > 3 && (
        <div class="text-base-content/40 italic">
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
  // const [limit, setLimit] = useState<number>(500);
  const limit = 500;

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
      {/* Controls */}
      <div class="flex flex-col sm:flex-row gap-4 items-center justify-center mb-6">
        <input
          type="text"
          placeholder="Filter changes by model ID or type..."
          value={filterText}
          onInput={(e) => setFilterText((e.target as HTMLInputElement).value)}
          class="input input-bordered w-full max-w-xs"
        />
        {
          /* <select
          value={limit}
          onChange={(e) => setLimit(parseInt((e.target as HTMLSelectElement).value))}
          class="select select-bordered w-full max-w-xs"
        >
          <option value={25}>Show 25</option>
          <option value={50}>Show 50</option>
          <option value={100}>Show 100</option>
          <option value={200}>Show 200</option>
        </select> */
        }
      </div>

      <div class="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto">
        {filteredChanges.map((change, index) => (
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

        {filteredChanges.length === 0 && (
          <div class="text-center py-10">
            <div class="text-lg text-base-content/50">No changes found</div>
          </div>
        )}
      </div>

      {lists.changes.length > 0 && (
        <div class="text-center mt-6 text-sm text-base-content/70">
          Showing {filteredChanges.length} of {lists.changes.length} total changes
        </div>
      )}
    </div>
  );
}
