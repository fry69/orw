// lib/state.ts - Fresh 2 global state management using signals
import { computed, signal } from "@preact/signals";
import type { Lists, WatcherStatus } from "../types/global.ts";
import { durationAgo } from "./utils.ts";

/**
 * Default values for global state
 */
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
 * Global signals for state management
 */
export const globalStatus = signal<WatcherStatus>(defaultStatus);
export const globalLists = signal<Lists>(defaultLists);

/**
 * Computed values for derived state
 */
export const navBarDurations = computed(() => ({
  dbLastChange: durationAgo(globalStatus.value.dbLastChange),
  apiLastCheck: globalStatus.value.isDevelopment
    ? "[dev mode]"
    : durationAgo(globalStatus.value.apiLastCheck, true),
}));

/**
 * Computed value for filtered models (to be used in ModelList island)
 */
export const filteredModels = computed(() => {
  // This will be implemented in the ModelList island
  return globalLists.value.models;
});
