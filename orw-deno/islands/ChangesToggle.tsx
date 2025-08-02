// orw-deno/islands/ChangesToggle.tsx
import { showOnlyAddRemove } from "../lib/state.ts";
import { FilterIcon } from "../components/Icons.tsx";

export default function ChangesToggle() {
  const isFiltered = showOnlyAddRemove.value;

  const handleClick = () => {
    showOnlyAddRemove.value = !showOnlyAddRemove.value;
  };

  const iconClass = isFiltered ? "text-primary transform scale-110" : "text-base-content/70";

  return (
    <button
      type="button"
      onClick={handleClick}
      class="btn btn-ghost btn-square btn-sm"
      title={isFiltered ? "Show all changes" : "Show only added/removed"}
    >
      <FilterIcon class={iconClass} size={20} />
    </button>
  );
}
