// components/ChangeItem.tsx - Renders a single attribute change
import {
  calculatePercentageChange,
  formatChangeValue,
} from "../lib/utils.ts";

interface ChangeItemProps {
  path: string;
  oldValue: unknown;
  newValue: unknown;
}

export function ChangeItem({ path, oldValue, newValue }: ChangeItemProps) {
  const oldFormatted = formatChangeValue(oldValue, path);
  const newFormatted = formatChangeValue(newValue, path);
  const percentageChange = calculatePercentageChange(oldValue, newValue);

  return (
    <div class="mb-1">
      <span class="text-success font-bold">{path}</span>:
      <span class="text-error ml-1">{oldFormatted}</span>
      <span class="mx-1">→</span>
      <span class="text-info">{newFormatted}</span>
      {percentageChange && (
        <span class="text-warning font-semibold">{percentageChange}</span>
      )}
    </div>
  );
}
