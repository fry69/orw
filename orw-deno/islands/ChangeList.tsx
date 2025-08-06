// islands/ChangeList.tsx - Interactive change history list
import { clientLists, filteredChanges } from "../lib/state.ts";
import type { ModelDiff } from "../lib/types.ts";
import { duration, formatDateTime } from "../lib/utils.ts";
import { ChangeView } from "../components/ChangeView.tsx";

export default function ChangeList() {
  // Don't render anything until data is available
  if (!clientLists.value) {
    return null;
  }

  // Derive sorted changes directly from computed value to avoid state delays
  const baseChanges = filteredChanges.value;
  const limit = 500;
  const sortedChanges = baseChanges
    .sort((a: ModelDiff, b: ModelDiff) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, limit);

  const handleRowClick = (changeId: string, event: Event) => {
    // Prevent double-clicking if user clicks directly on the link
    if ((event.target as HTMLElement).tagName === "A") {
      return;
    }

    // Find and click the link to trigger Fresh Partials
    if (changeId) {
      const card = event.currentTarget as HTMLElement;
      const link = card.querySelector("a[data-model-link]");
      if (link) {
        (link as HTMLAnchorElement).click();
      }
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
              change.id ? "cursor-pointer hover:bg-accent/10 hover:border-accent/50" : ""
            }`}
            onClick={(e) => change.id && handleRowClick(change.id, e)}
          >
            <div class="card-body">
              <div class="flex justify-between items-start mb-2">
                <div class="flex items-center gap-2">
                  <span
                    class={`badge ${getChangeTypeBadge(change.type)} badge-sm w-18 justify-center`}
                  >
                    {change.type.toUpperCase()}
                  </span>
                  {change.id
                    ? (
                      <a
                        href={`/model/${encodeURIComponent(change.id)}`}
                        class="card-title text-lg link link-hover"
                        data-model-link
                      >
                        {change.id}
                      </a>
                    )
                    : <h3 class="card-title text-lg">Unknown Model</h3>}
                </div>
                <div class="text-right text-sm text-base-content/70">
                  <div>{formatDateTime(change.timestamp)}</div>
                  <div class="font-bold text-warning">{duration(change.timestamp)}</div>
                </div>
              </div>

              <ChangeView change={change} />
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
