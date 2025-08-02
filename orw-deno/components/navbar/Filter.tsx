// orw-deno/components/navbar/Filter.tsx
import { filterStatus, filterText } from "../../lib/state.ts";
import { ClearIcon } from "../Icons.tsx";

export default function Filter() {
  return (
    <div class="form-control">
      <div class="relative">
        <input
          type="text"
          placeholder="Filter models..."
          value={filterText.value}
          onInput={(e) => filterText.value = (e.target as HTMLInputElement).value}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              filterText.value = "";
              (e.target as HTMLInputElement).blur();
            }
          }}
          class="input input-bordered input-sm w-full max-w-xs pr-10"
        />
        {filterText.value && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              filterText.value = "";
            }}
            class="absolute right-1 top-1/2 transform -translate-y-1/2 btn btn-ghost btn-xs p-1 min-h-0 h-6 w-6 z-10"
            title="Clear filter"
            aria-label="Clear filter"
          >
            <ClearIcon size={12} />
          </button>
        )}
      </div>
      {filterStatus.value && (
        <div class="text-center text-xs text-base-content/60 mt-1">
          {filterStatus.value}
        </div>
      )}
    </div>
  );
}
