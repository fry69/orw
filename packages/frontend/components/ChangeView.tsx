// components/ChangeView.tsx - Renders a complete ModelDiff object
import type { ModelDiff } from "@orw/lib/types";
import { ChangeItem } from "./ChangeItem.tsx";

interface ChangeViewProps {
  change: ModelDiff;
  summaryLimit?: number; // Optional: limit the number of changes shown
}

export function ChangeView({ change, summaryLimit }: ChangeViewProps) {
  // For "added" or "removed" types, we don't need to show details here.
  // The parent component will show a badge.
  if (change.type === "added" || change.type === "removed") {
    // Optionally, you could show the full model JSON here, but for now, we keep it clean.
    return null;
  }

  if (!change.changes || Object.keys(change.changes).length === 0) {
    // Render nothing if there are no detailed changes, removing "chatter".
    return null;
  }

  const changeEntries = Object.entries(change.changes);
  const limitedEntries = summaryLimit ? changeEntries.slice(0, summaryLimit) : changeEntries;

  return (
    <div class="mt-2 text-xs text-base-content/70">
      {limitedEntries.map(([path, changeItem]) => (
        <ChangeItem
          key={path}
          path={path}
          oldValue={changeItem.old}
          newValue={changeItem.new}
        />
      ))}
      {summaryLimit && changeEntries.length > summaryLimit && (
        <div class="text-base-content/40 italic">
          ... and {changeEntries.length - summaryLimit} more changes
        </div>
      )}
    </div>
  );
}
