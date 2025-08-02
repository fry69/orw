// orw-deno/islands/ChangesToggle.tsx
import { showOnlyAddRemove } from "../lib/state.ts";

export default function ChangesToggle() {
  const isChecked = showOnlyAddRemove.value;

  const handleChange = () => {
    showOnlyAddRemove.value = !showOnlyAddRemove.value;
  };

  return (
    <div class="flex items-center gap-2">
      <label class="label cursor-pointer">
        <span class="label-text text-xs mr-2">Show only Add/Remove</span>
        <input
          type="checkbox"
          class="toggle toggle-sm"
          checked={isChecked}
          onChange={handleChange}
        />
      </label>
    </div>
  );
}
