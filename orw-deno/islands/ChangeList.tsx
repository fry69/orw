// islands/ChangeList.tsx - Interactive change history list
import { useEffect, useState } from "preact/hooks";
import { filteredChanges } from "../lib/state.ts";
import type { ModelDiff } from "../lib/types.ts";
import { durationAgo, formatDateTime } from "../lib/utils.ts";
import { ChangeView } from "../components/ChangeView.tsx";

export default function ChangeList() {
  // Use shared filter signal instead of local state
  const baseChanges = filteredChanges.value;
  const [sortedChanges, setSortedChanges] = useState<ModelDiff[]>([]);
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
      case "changed":
        return "badge-warning";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div class="container mx-auto px-4 py-6">
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

              <ChangeView change={change}/>
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
