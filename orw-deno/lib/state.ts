// lib/state.ts - Fresh 2 client state management using signals
import { computed, signal } from "@preact/signals";
import type { AppConfig, Lists, WatcherStatus } from "./types.ts";
import { durationAgo } from "./utils.ts";

/**
 * Default values for client state
 */
const defaultConfig: AppConfig = {
  publicUrl: "http://localhost:8000",
  repositoryUrl: null,
};

const defaultStatus: WatcherStatus = {
  isDevelopment: false,
  apiLastCheck: "",
  apiLastCheckStatus: "",
  dbLastChange: "",
};

const defaultLists: Lists = {
  models: [],
  removed: [],
  changes: [],
};

/**
 * Client signals for state management
 */
export const clientConfig = signal<AppConfig>(defaultConfig);
export const clientStatus = signal<WatcherStatus>(defaultStatus);
export const clientLists = signal<Lists>(defaultLists);

/**
 * Computed values for derived state
 */
export const navBarDurations = computed(() => ({
  dbLastChange: durationAgo(clientStatus.value.dbLastChange),
  apiLastCheck: clientStatus.value.isDevelopment
    ? "[dev mode]"
    : durationAgo(clientStatus.value.apiLastCheck, true),
}));

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
 * Computed value for filtered models
 */
export const filteredModels = computed(() => {
  const models = clientLists.value.models;
  const filter = filterText.value.toLowerCase();

  if (!filter) return models;

  return models.filter((model) =>
    model.id.toLowerCase().includes(filter) ||
    model.name.toLowerCase().includes(filter)
  );
});

/**
 * Computed value for filtered removed models
 */
export const filteredRemovedModels = computed(() => {
  const models = clientLists.value.removed;
  const filter = filterText.value.toLowerCase();

  if (!filter) return models;

  return models.filter((model) =>
    model.id.toLowerCase().includes(filter) ||
    model.name.toLowerCase().includes(filter)
  );
});

/**
 * Computed value for filtered changes
 */
export const filteredChanges = computed(() => {
  const changes = clientLists.value.changes;
  const filter = filterText.value.toLowerCase();

  if (!filter) return changes;

  return changes.filter((change) =>
    change.id?.toLowerCase().includes(filter) ||
    change.type?.toLowerCase().includes(filter)
  );
});

/**
 * Computed value for filter status text based on current page
 */
export const filterStatus = computed(() => {
  const filter = filterText.value.toLowerCase();
  const pathname = globalThis.location?.pathname || "";

  // Only show status when there's text in the filter
  if (!filter) return "";

  if (pathname === "/changes") {
    const filtered = filteredChanges.value.length;
    const total = clientLists.value.changes.length;
    return total > 0 ? `${Math.min(filtered, 500)} of ${total} changes` : "";
  } else if (pathname === "/removed") {
    const filtered = filteredRemovedModels.value.length;
    const total = clientLists.value.removed.length;
    return total > 0 ? `${filtered} of ${total} models` : "";
  } else if (pathname === "/list" || pathname === "/" || pathname === "") {
    const filtered = filteredModels.value.length;
    const total = clientLists.value.models.length;
    return total > 0 ? `${filtered} of ${total} models` : "";
  }

  return "";
});
