// lib/state.ts - Fresh 2 client state management using signals
import { computed, signal } from "@preact/signals";
import type { AppConfig, Lists, WatcherStatus } from "@orw/lib/types";
import { duration } from "./utils.ts";

/**
 * Client signals for state management - no default values to avoid flicker
 */
export const clientConfig = signal<AppConfig | undefined>(undefined);
export const clientStatus = signal<WatcherStatus | undefined>(undefined);
export const clientLists = signal<Lists | undefined>(undefined);

/**
 * Computed values for derived state - null-safe
 */
export const navBarDurations = computed(() => {
  const status = clientStatus.value;
  if (!status) {
    return {
      dbLastChange: "",
      apiNextCheck: "",
    };
  }

  return {
    dbLastChange: duration(status.dbLastChange),
    apiNextCheck: status.isDevelopment ? "[dev mode]" : duration(status.apiLastCheck, true),
  };
});

/**
 * Filter state for models with localStorage persistence
 */
const getInitialFilterText = (): string => {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    try {
      return globalThis.localStorage.getItem("orw_filter_text") || "";
    } catch {
      return "";
    }
  }
  return "";
};

export const filterText = signal<string>(getInitialFilterText());

// Save filter text to localStorage whenever it changes
filterText.subscribe((value) => {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    try {
      if (value) {
        globalThis.localStorage.setItem("orw_filter_text", value);
      } else {
        globalThis.localStorage.removeItem("orw_filter_text");
      }
    } catch {
      // Ignore localStorage errors
    }
  }
});

/**
 * Toggle state for showing only add/remove changes with localStorage persistence
 */
const getInitialShowOnlyAddRemove = (): boolean => {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    try {
      return globalThis.localStorage.getItem("orw_show_only_add_remove") === "true";
    } catch {
      return false;
    }
  }
  return false;
};

export const showOnlyAddRemove = signal<boolean>(getInitialShowOnlyAddRemove());

// Save toggle state to localStorage whenever it changes
showOnlyAddRemove.subscribe((value) => {
  if (typeof globalThis !== "undefined" && globalThis.localStorage) {
    try {
      globalThis.localStorage.setItem("orw_show_only_add_remove", String(value));
    } catch {
      // Ignore localStorage errors
    }
  }
});

export const currentRoute = signal<string>("");

/**
 * Computed value for filtered models - null-safe
 */
export const filteredModels = computed(() => {
  const lists = clientLists.value;
  if (!lists) return [];

  const models = lists.models;
  const filter = filterText.value.toLowerCase();

  if (!filter) return models;

  return models.filter((model) =>
    model.id.toLowerCase().includes(filter) ||
    model.name.toLowerCase().includes(filter)
  );
});

/**
 * Computed value for filtered removed models - null-safe
 */
export const filteredRemovedModels = computed(() => {
  const lists = clientLists.value;
  if (!lists) return [];

  const models = lists.removed;
  const filter = filterText.value.toLowerCase();

  if (!filter) return models;

  return models.filter((model) =>
    model.id.toLowerCase().includes(filter) ||
    model.name.toLowerCase().includes(filter)
  );
});

/**
 * Computed value for filtered changes - null-safe
 */
export const filteredChanges = computed(() => {
  const lists = clientLists.value;
  if (!lists) return [];

  const changes = lists.changes;
  const filter = filterText.value.toLowerCase();
  const onlyAddRemove = showOnlyAddRemove.value;

  return changes.filter((change) => {
    const typeMatch = !onlyAddRemove || change.type === "added" ||
      change.type === "removed";
    const textMatch = !filter ||
      (change.id?.toLowerCase().includes(filter) ||
        change.type?.toLowerCase().includes(filter));
    return typeMatch && textMatch;
  });
});

/**
 * Computed value for filter status text based on current page - null-safe
 */
export const filterStatus = computed(() => {
  const lists = clientLists.value;
  if (!lists) return "";

  const filter = filterText.value.toLowerCase();
  const pathname = globalThis.location?.pathname || "";

  // Only show status when there's text in the filter
  if (!filter) return "";

  if (pathname === "/changes") {
    const filtered = filteredChanges.value.length;
    const total = lists.changes.length;
    return total > 0 ? `${Math.min(filtered, 500)} of ${total} changes` : "";
  } else if (pathname === "/removed") {
    const filtered = filteredRemovedModels.value.length;
    const total = lists.removed.length;
    return total > 0 ? `${filtered} of ${total} models` : "";
  } else if (pathname === "/list" || pathname === "/" || pathname === "") {
    const filtered = filteredModels.value.length;
    const total = lists.models.length;
    return total > 0 ? `${filtered} of ${total} models` : "";
  }

  return "";
});
